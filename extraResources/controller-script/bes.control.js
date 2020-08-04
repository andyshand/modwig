var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
loadAPI(10);
load('es5-shim.min.js');
load('json3.min.js');
load('Object2.js');
var FX_TRACK_BANK_SIZE = 16;
var MAIN_TRACK_BANK_SIZE = 128;
host.setShouldFailOnDeprecatedUse(true);
host.defineController("andy shand", "Bitwig Enhancement Suite", "0.1", "b90a4894-b89c-40b9-b372-e1e8659699df", "andy shand");
var connection;
var EventEmitter = /** @class */ (function () {
    function EventEmitter() {
        this.nextId = 0;
        this.listenersById = {};
    }
    EventEmitter.prototype.listen = function (cb) {
        var nowId = this.nextId++;
        this.listenersById[nowId] = cb;
    };
    EventEmitter.prototype.emit = function (value) {
        for (var _i = 0, _a = Object2.values(this.listenersById); _i < _a.length; _i++) {
            var listener = _a[_i];
            listener(value);
        }
    };
    return EventEmitter;
}());
var PacketManager = /** @class */ (function () {
    function PacketManager() {
        var _this = this;
        this.listenersByType = {};
        this.connection = connection;
        println("Created remote connection on port: " + this.connection.getPort());
        this.connection.setClientConnectCallback(function (connection) {
            println("Connected to Node");
            _this.activeConnection = connection;
            _this.activeConnection.setDisconnectCallback(function () {
                println("Disconnected from Node");
                _this.activeConnection = null;
            });
            _this.activeConnection.setReceiveCallback(function (data) {
                try {
                    var str = bytesToString(data);
                    // println('string is ' + str)
                    var packet = JSON.parse(str);
                    // println('parsed the packet')
                    var listeners = _this.listenersByType[packet.type] || [];
                    if (packet.type === 'ping') {
                        return _this.send({ type: 'pong' });
                    }
                    // host.showPopupNotification(packet.type)
                    // println('send response???')
                    for (var _i = 0, listeners_1 = listeners; _i < listeners_1.length; _i++) {
                        var listener = listeners_1[_i];
                        try {
                            listener(packet);
                        }
                        catch (e) {
                            println(e);
                        }
                    }
                }
                catch (e) {
                    println(e);
                }
            });
        });
    }
    PacketManager.prototype.listen = function (type, cb) {
        this.listenersByType[type] = this.listenersByType[type] || [].concat(cb);
    };
    PacketManager.prototype.send = function (packet) {
        if (this.activeConnection) {
            var asString = JSON.stringify(packet);
            this.activeConnection.send((asString.length + asString).getBytes());
        }
    };
    return PacketManager;
}());
var Controller = /** @class */ (function () {
    function Controller(deps) {
        this.deps = deps;
        Controller.controllers[this.constructor.name] = this;
    }
    Controller.get = function (classs) {
        return Controller.controllers[classs.name];
    };
    Controller.controllers = {};
    return Controller;
}());
var GlobalController = /** @class */ (function (_super) {
    __extends(GlobalController, _super);
    function GlobalController(deps) {
        var _this = _super.call(this, deps) || this;
        _this.deps = deps;
        _this.trackBank = host.createMainTrackBank(MAIN_TRACK_BANK_SIZE, 0, 0);
        _this.fxBank = host.createEffectTrackBank(FX_TRACK_BANK_SIZE, 0);
        _this.cursorTrack = host.createCursorTrack("selectedTrack", "selectedTrack", 0, 0, true);
        _this.lastSelectedTrack = '';
        /**
         * Will get called whenever the name of the current track changes (most reliable way I know of)
         */
        _this.selectedTrackChanged = new EventEmitter();
        _this.cursorTrack.name().markInterested();
        _this.cursorTrack.name().addValueObserver(function (value) {
            _this.lastSelectedTrack = value;
            _this.selectedTrackChanged.emit(value);
        });
        _this.mapTracks(function (t, i) {
            t.name().markInterested();
            t.solo().markInterested();
            t.mute().markInterested();
            t.color().markInterested();
            t.position().markInterested();
            t.volume().markInterested();
            // send all tracks when track name changes
            // hopefully this runs when new tracks are added
            t.name().addValueObserver(function (name) {
                if (Controller.get(TrackSearchController).active) {
                    // Don't send track changes whilst highlighting search results
                    return;
                }
                _this.sendAllTracks();
            });
        });
        return _this;
    }
    GlobalController.prototype.mapTracks = function (cb) {
        var out = [];
        for (var i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            var t = this.trackBank.getItemAt(i);
            out.push(cb(t, i));
        }
        for (var i = 0; i < FX_TRACK_BANK_SIZE; i++) {
            var t = this.fxBank.getItemAt(i);
            out.push(cb(t, i + MAIN_TRACK_BANK_SIZE));
        }
        return out;
    };
    GlobalController.prototype.sendAllTracks = function () {
        var tracks = this.mapTracks(function (t, i) {
            return {
                name: t.name().get(),
                solo: t.solo().get(),
                mute: t.mute().get(),
                color: t.color().get(),
                position: t.position().get(),
                volume: t.volume().get()
            };
        });
        this.deps.packetManager.send({
            type: 'tracks',
            data: tracks
        });
    };
    GlobalController.prototype.selectTrackWithName = function (name) {
        for (var i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            var t = this.trackBank.getItemAt(i);
            if (t.name().get() == name) {
                t.selectInMixer();
                t.makeVisibleInArranger();
                return;
            }
        }
        for (var i = 0; i < FX_TRACK_BANK_SIZE; i++) {
            var t = this.fxBank.getItemAt(i);
            if (t.name().get() == name) {
                t.selectInMixer();
                t.makeVisibleInArranger();
                return;
            }
        }
    };
    return GlobalController;
}(Controller));
var TrackSearchController = /** @class */ (function (_super) {
    __extends(TrackSearchController, _super);
    function TrackSearchController(deps) {
        var _this = _super.call(this, deps) || this;
        _this.trackSelectedWhenStarted = '';
        _this.active = false;
        var packetManager = deps.packetManager, globalController = deps.globalController;
        packetManager.listen('tracksearch/start', function () {
            _this.trackSelectedWhenStarted = globalController.lastSelectedTrack;
            _this.active = true;
            globalController.sendAllTracks();
        });
        packetManager.listen('tracksearch/cancel', function () {
            if (_this.trackSelectedWhenStarted.length > 0) {
                globalController.selectTrackWithName(_this.trackSelectedWhenStarted);
            }
            _this.active = false;
        });
        packetManager.listen('tracksearch/highlighted', function (_a) {
            var trackName = _a.data;
            globalController.selectTrackWithName(trackName);
        });
        packetManager.listen('tracksearch/confirm', function (_a) {
            var trackName = _a.data;
            _this.active = false;
            globalController.selectTrackWithName(trackName);
        });
        return _this;
    }
    return TrackSearchController;
}(Controller));
var BackForwardController = /** @class */ (function (_super) {
    __extends(BackForwardController, _super);
    function BackForwardController(deps) {
        var _this = _super.call(this, deps) || this;
        _this.trackHistory = [];
        _this.historyIndex = -1;
        _this.ignoreSelectionChangesOnce = false;
        _this.onSelectedTrackChanged = function (name) {
            if (Controller.get(TrackSearchController).active) {
                // Don't record track changes whilst highlighting search results
                return;
            }
            if (name.trim().length == 0 || _this.ignoreSelectionChangesOnce) {
                _this.ignoreSelectionChangesOnce = false;
                return;
            }
            while (_this.trackHistory.length > 50) {
                _this.trackHistory.splice(0, 1);
                _this.historyIndex--;
            }
            _this.trackHistory = _this.trackHistory.slice(0, _this.historyIndex + 1);
            // println('track name changed to ' + value)
            _this.trackHistory.push({ name: name });
            _this.historyIndex++;
        };
        var packetManager = deps.packetManager, globalController = deps.globalController;
        globalController.selectedTrackChanged.listen(_this.onSelectedTrackChanged);
        packetManager.listen('tracknavigation/back', function () {
            if (_this.historyIndex > 0) {
                _this.ignoreSelectionChangesOnce = true;
                _this.historyIndex--;
                globalController.selectTrackWithName(_this.trackHistory[_this.historyIndex].name);
            }
        });
        packetManager.listen('tracknavigation/forward', function () {
            if (_this.historyIndex < _this.trackHistory.length - 1) {
                _this.ignoreSelectionChangesOnce = true;
                _this.historyIndex++;
                globalController.selectTrackWithName(_this.trackHistory[_this.historyIndex].name);
            }
        });
        return _this;
    }
    return BackForwardController;
}(Controller));
function bytesToString(data) {
    var clientData = "";
    for (var i = 0; i < data.length; i++) {
        clientData += String.fromCharCode(data[i]);
    }
    return clientData;
}
;
function init() {
    // var app = host.createApplication()
    var transport = host.createTransport();
    connection = host.createRemoteConnection("name", 8888);
    println("Created the host");
    // fix for bug that doesn't reset automation at specific point
    transport.getPosition().markInterested();
    transport.playStartPosition().markInterested();
    var isPlaying = false;
    transport.isPlaying().addValueObserver(function (yesOrNo) {
        if (yesOrNo) {
            isPlaying = true;
        }
        else if (isPlaying) {
            isPlaying = false;
            transport.getPosition().set(transport.playStartPosition().get());
        }
    });
    var deps = {};
    deps.packetManager = new PacketManager();
    deps.globalController = new GlobalController(deps);
    new TrackSearchController(deps);
    new BackForwardController(deps);
}
