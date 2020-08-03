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
load('JSON.js');
var FX_TRACK_BANK_SIZE = 32;
var MAIN_TRACK_BANK_SIZE = 128;
host.setShouldFailOnDeprecatedUse(true);
host.defineController("andy shand", "Bitwig Enhancement Suite", "0.1", "b90a4894-b89c-40b9-b372-e1e8659699df", "andy shand");
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
        for (var _i = 0, _a = Object.values(this.listenersById); _i < _a.length; _i++) {
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
        this.connection = host.createRemoteConnection("browser_connection", 8182);
        this.connection.setClientConnectCallback(function (connection) {
            println("connected");
            _this.activeConnection = connection;
            _this.activeConnection.setDisconnectCallback(function () {
                println("closed");
                _this.activeConnection = null;
            });
            _this.activeConnection.setReceiveCallback(function (data) {
                try {
                    var str = bytesToString(data);
                    var packet = JSON.parse(str);
                    var listeners = _this.listenersByType[packet.type] || [];
                    for (var _i = 0, listeners_1 = listeners; _i < listeners_1.length; _i++) {
                        var listener = listeners_1[_i];
                        try {
                            listener(packet);
                        }
                        catch (e) {
                            errorln('packet handler errored: ' + e);
                        }
                    }
                }
                catch (e) {
                    errorln('error parsing packet');
                }
            });
        });
    }
    PacketManager.prototype.listen = function (type, cb) {
        this.listenersByType[type] = this.listenersByType[type] || [].concat(cb);
    };
    PacketManager.prototype.send = function (packet) {
        this.activeConnection.send(JSON.stringify(packet));
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
        _this.trackBank = host.createTrackBank(MAIN_TRACK_BANK_SIZE, 0, 0);
        _this.cursorTrack = host.createCursorTrack("selectedTrack", "selectedTrack", 0, 0, true);
        _this.lastSelectedTrack = '';
        /**
         * Will get called whenever the name of the current track changes (most reliable way I know of)
         */
        _this.selectedTrackChanged = new EventEmitter();
        _this.cursorTrack.name().markIntersted();
        _this.cursorTrack.name().addValueObserver(function (value) {
            _this.lastSelectedTrack = value;
            _this.selectedTrackChanged.emit(value);
        });
        for (var i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            var t = _this.trackBank.getItemAt(i);
            t.name().markInterested();
            t.solo().markInterested();
            t.mute().markInterested();
            t.color().markInterested();
            t.position().markInterested();
            t.volume().markInterested();
            // send all tracks when track name changes
            // hopefully this runs when new tracks are added
            t.name().addValueObserver(function (name) {
                _this.sendAllTracks();
            });
        }
        return _this;
    }
    GlobalController.prototype.mapTracks = function (cb) {
        var out = [];
        for (var i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            var t = this.trackBank.getItemAt(i);
            out.push(cb(t, i));
        }
        return out;
    };
    GlobalController.prototype.sendAllTracks = function () {
        var tracks = this.mapTracks(function (t, i) {
            return {
                name: t.name.get(),
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
        var packetManager = deps.packetManager, globalController = deps.globalController;
        globalController.selectedTrackChanged.listen(_this.onSelectedTrackChanged);
        packetManager.listen('tracknavigation/back', function (_a) {
            var trackName = _a.data;
            if (_this.historyIndex > 0) {
                _this.ignoreSelectionChangesOnce = true;
                _this.historyIndex--;
                globalController.selectTrackWithName(_this.trackHistory[_this.historyIndex].name);
            }
        });
        packetManager.listen('tracknavigation/forward', function (_a) {
            var trackName = _a.data;
            if (_this.historyIndex < _this.trackHistory.length - 1) {
                _this.ignoreSelectionChangesOnce = true;
                _this.historyIndex++;
                globalController.selectTrackWithName(_this.trackHistory[_this.historyIndex].name);
            }
        });
        return _this;
    }
    BackForwardController.prototype.onSelectedTrackChanged = function (name) {
        if (Controller.get(TrackSearchController).active) {
            // Don't record track changes whilst highlighting search results
            return;
        }
        if (name.trim().length == 0 || this.ignoreSelectionChangesOnce) {
            this.ignoreSelectionChangesOnce = false;
            return;
        }
        while (this.trackHistory.length > 50) {
            this.trackHistory.splice(0, 1);
            this.historyIndex--;
        }
        this.trackHistory = this.trackHistory.slice(0, this.historyIndex + 1);
        // println('track name changed to ' + value)
        this.trackHistory.push({ name: name });
        this.historyIndex++;
    };
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
}
