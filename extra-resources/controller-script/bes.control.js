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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
loadAPI(10);
load('es5-shim.min.js');
load('json3.min.js');
load('Object2.js');
var FX_TRACK_BANK_SIZE = 16;
var MAIN_TRACK_BANK_SIZE = 128;
var CUE_MARKER_BANK_SIZE = 32;
var DEVICE_BANK_SIZE = 16;
var LAYER_BANK_SIZE = 16;
host.setShouldFailOnDeprecatedUse(false);
host.defineController("andy shand", "Modwig", "0.1", "b90a4894-b89c-40b9-b372-e1e8659699df", "andy shand");
var app;
var connection;
var settings = {
    exclusiveArm: true
};
var PacketError = /** @class */ (function () {
    function PacketError(code, message) {
        this.code = code;
        this.message = message;
    }
    return PacketError;
}());
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
function runAction(actionName) {
    var action = app.getAction(actionName);
    if (action) {
        action.invoke();
    }
    else {
        host.showPopupNotification("Action " + actionName + " not found");
    }
}
var PacketManager = /** @class */ (function () {
    function PacketManager(_a) {
        var _this = this;
        var app = _a.app;
        this.listenersByType = {};
        this.connection = connection;
        println("Created remote connection on port: " + this.connection.getPort());
        this.connection.setClientConnectCallback(function (connection) {
            host.showPopupNotification("BES Connected");
            println("Connected to Node");
            _this.activeConnection = connection;
            _this.activeConnection.setDisconnectCallback(function () {
                println("Disconnected from Node");
                host.showPopupNotification("BES Disconnected");
                _this.activeConnection = null;
            });
            _this.activeConnection.setReceiveCallback(function (data) {
                try {
                    var str = bytesToString(data);
                    // println('string is ' + str)
                    var packet = JSON.parse(str);
                    // println('parsed the packet')
                    var listeners = _this.listenersByType[packet.type] || [];
                    var warnNoListeners = listeners.length === 0;
                    if (packet.type === 'ping') {
                        return _this.send({ type: 'pong' });
                    }
                    if (packet.type === 'action') {
                        warnNoListeners = false;
                        var actions = typeof packet.data === 'object' ? packet.data : [packet.data];
                        for (var _i = 0, actions_1 = actions; _i < actions_1.length; _i++) {
                            var actionName = actions_1[_i];
                            runAction(actionName);
                        }
                    }
                    // host.showPopupNotification(packet.type)
                    // println('send response???')
                    var errors = [];
                    if (warnNoListeners) {
                        host.showPopupNotification('No listeners attached for packet type: ' + packet.type);
                    }
                    for (var _a = 0, listeners_1 = listeners; _a < listeners_1.length; _a++) {
                        var listener = listeners_1[_a];
                        try {
                            var response = listener(packet);
                            if (response) {
                                _this.send(__assign({ id: packet.id }, response));
                            }
                        }
                        catch (e) {
                            errors.push(e);
                            println(e);
                        }
                    }
                    // Send back the packet with additional info so we have a way
                    // of tracking when things have been processed
                    _this.send({
                        id: packet.id,
                        data: packet.data,
                        type: packet.type,
                        status: errors.length ? 500 : 200,
                        errors: errors
                    });
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
        _this.masterTrack = host.createMasterTrack(0);
        _this.nameCache = {};
        /**
         * Will get called whenever the name of the current track changes (most reliable way I know of)
         */
        _this.selectedTrackChanged = new EventEmitter();
        var packetManager = deps.packetManager;
        packetManager.listen('track/update', function (_a) {
            var _b = _a.data, name = _b.name, volume = _b.volume, solo = _b.solo, mute = _b.mute;
            var track = _this.findTrackByName(name);
            if (!track) {
                throw new PacketError(404, "Track not found");
            }
            if (volume !== undefined) {
                track.volume().set(volume);
            }
            if (solo !== undefined) {
                track.solo().set(solo);
            }
            if (mute !== undefined) {
                track.mute().set(mute);
            }
            return {
                type: 'track/update',
                data: _this.createTrackInfo(track)
            };
        });
        _this.deps.app.projectName().markInterested();
        packetManager.listen('application/undo', function () { return _this.deps.app.undo(); });
        packetManager.listen('application/redo', function () { return _this.deps.app.redo(); });
        _this.cursorTrack.name().markInterested();
        _this.cursorTrack.name().addValueObserver(function (value) {
            _this.lastSelectedTrack = value;
            _this.selectedTrackChanged.emit(value);
        });
        _this.mapTracks(function (t, i, isFX) {
            t.name().markInterested();
            t.solo().markInterested();
            t.arm().markInterested();
            t.mute().markInterested();
            t.color().markInterested();
            t.position().markInterested();
            t.trackType().markInterested();
            t.volume().markInterested();
            t.volume().displayedValue().markInterested();
            // send all tracks when track name changes
            // hopefully this runs when new tracks are added
            t.name().addValueObserver(function (name) {
                _this.nameCache = {};
                if (Controller.get(TrackSearchController).active) {
                    // Don't send track changes whilst highlighting search results
                    return;
                }
                // Clear the name cache, could now be wrong
                _this.sendAllTracks();
            });
            t.addIsSelectedInEditorObserver(function (selected) {
                if (selected) {
                    // this is basically the hook for when selected track changes
                    if (t.trackType().get() !== "Group") {
                        // Group tracks bug out when you make them visible,
                        // vertically centering on their child content and not 
                        // actually showing the group
                        // t.makeVisibleInArranger()
                    }
                }
                _this.deps.packetManager.send({
                    type: 'trackselected',
                    data: __assign(__assign({ selected: selected }, _this.createTrackInfo(t, isFX)), { project: { name: _this.deps.app.projectName().get() } })
                });
            });
            // Exclusive arm
            t.arm().addValueObserver(function (armed) {
                if (armed) {
                    if (settings.exclusiveArm) {
                        // Unarm all other tracks
                        _this.mapTracks(function (t, i2) {
                            if (i !== i2) {
                                t.arm().set(false);
                            }
                        });
                    }
                }
            });
        });
        _this.cueMarkerBank = _this.deps.arranger.createCueMarkerBank(CUE_MARKER_BANK_SIZE);
        _this.mapCueMarkers(function (marker) {
            marker.getName().markInterested();
            marker.getColor().markInterested();
            marker.position().markInterested();
            marker.getName().addValueObserver(function (name) {
                _this.sendAllCueMarkers();
            });
        });
        deps.transport.getPosition().addValueObserver(function (position) {
            _this.deps.packetManager.send({
                type: 'transport',
                data: {
                    position: position
                }
            });
        });
        return _this;
    }
    GlobalController.prototype.mapCueMarkers = function (cb, filterNull) {
        if (filterNull === void 0) { filterNull = false; }
        var out = [];
        var processC = function (cm, i) {
            var result = cb(cm, i);
            if (!filterNull || result != null) {
                out.push(result);
            }
        };
        for (var i = 0; i < CUE_MARKER_BANK_SIZE; i++) {
            processC(this.cueMarkerBank.getItemAt(i), i);
        }
        return out;
    };
    GlobalController.prototype.mapTracks = function (cb, filterNull) {
        if (filterNull === void 0) { filterNull = false; }
        var out = [];
        var processT = function (track, i, isFX) {
            if (isFX === void 0) { isFX = false; }
            var result = cb(track, i, isFX);
            if (!filterNull || result != null) {
                out.push(result);
            }
        };
        for (var i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            processT(this.trackBank.getItemAt(i), i);
        }
        for (var i = 0; i < FX_TRACK_BANK_SIZE; i++) {
            processT(this.fxBank.getItemAt(i), i + MAIN_TRACK_BANK_SIZE, true);
        }
        processT(this.masterTrack, MAIN_TRACK_BANK_SIZE + FX_TRACK_BANK_SIZE, false);
        return out;
    };
    GlobalController.prototype.createTrackInfo = function (t, isFX) {
        if (isFX === void 0) { isFX = false; }
        var name = t.name().get();
        return {
            name: name,
            color: convertBWColorToHex(t.color()),
            solo: t.solo().get(),
            mute: t.mute().get(),
            position: t === this.masterTrack ? -1 : (t.position().get() + (isFX ? MAIN_TRACK_BANK_SIZE : 0)),
            volume: t.volume().get(),
            volumeString: t.volume().displayedValue().get(),
            type: t.trackType().get()
        };
    };
    GlobalController.prototype.createCueMarkerInfo = function (cueMarker) {
        return {
            name: cueMarker.getName().get(),
            position: cueMarker.position().get(),
            color: convertBWColorToHex(cueMarker.getColor())
        };
    };
    GlobalController.prototype.sendProject = function () {
        this.deps.packetManager.send({
            type: 'project',
            data: {
                name: this.deps.app.projectName().get()
            }
        });
    };
    GlobalController.prototype.sendAllTracks = function () {
        var _this = this;
        var tracks = this.mapTracks(function (t, i, isFX) {
            var name = t.name().get();
            if (name.length === 0)
                return null;
            return _this.createTrackInfo(t);
        }, true);
        this.sendProject();
        this.deps.packetManager.send({
            type: 'tracks',
            data: tracks
        });
    };
    GlobalController.prototype.sendAllCueMarkers = function () {
        var _this = this;
        var cueMarkers = this.mapCueMarkers(function (cm, i) {
            var name = cm.getName().get();
            if (name.length === 0)
                return null;
            return _this.createCueMarkerInfo(cm);
        }, true);
        this.deps.packetManager.send({
            type: 'cue-markers',
            data: cueMarkers
        });
    };
    GlobalController.prototype.addTrackToCache = function (name) {
        for (var i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            var t = this.trackBank.getItemAt(i);
            if (t.name().get() == name) {
                this.nameCache[name] = t;
                return;
            }
        }
        for (var i = 0; i < FX_TRACK_BANK_SIZE; i++) {
            var t = this.fxBank.getItemAt(i);
            if (t.name().get() == name) {
                this.nameCache[name] = t;
                return;
            }
        }
    };
    GlobalController.prototype.findTrackByName = function (name) {
        if (name === 'Master') {
            return this.masterTrack;
        }
        if (!this.nameCache[name]) {
            this.addTrackToCache(name);
        }
        return this.nameCache[name];
    };
    GlobalController.prototype.selectTrackWithName = function (name) {
        var t = this.findTrackByName(name);
        t.selectInMixer();
        t.makeVisibleInArranger();
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
            globalController.sendAllCueMarkers();
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
var BugFixController = /** @class */ (function (_super) {
    __extends(BugFixController, _super);
    function BugFixController(deps) {
        var _this = _super.call(this, deps) || this;
        _this.trackSelectedWhenStarted = '';
        _this.active = false;
        var wait = 40;
        var packetManager = deps.packetManager, globalController = deps.globalController;
        packetManager.listen('bugfix/buzzing', function () {
            globalController.mapTracks(function (track, i) {
                host.scheduleTask(function () {
                    track.solo().set(true);
                }, wait * i);
                host.scheduleTask(function () {
                    track.solo().set(false);
                }, wait * i + wait);
            });
        });
        return _this;
    }
    return BugFixController;
}(Controller));
var DeviceController = /** @class */ (function (_super) {
    __extends(DeviceController, _super);
    function DeviceController(deps) {
        var _this = _super.call(this, deps) || this;
        _this.trackSelectedWhenStarted = '';
        _this.active = false;
        _this.reverseSlots = [
            "Polysynth",
            "Phase-4",
            "Reverb",
            "FM-4",
            "Sampler"
        ];
        _this.deviceSlotMaps = {
            'Multiband FX-3': {
                1: 2,
                2: 1
            },
            'Delay-4': {
                3: 2,
                2: 3
            }
        };
        for (var _i = 0, _a = _this.reverseSlots; _i < _a.length; _i++) {
            var device = _a[_i];
            _this.deviceSlotMaps[device] = {
                0: 1,
                1: 0
            };
        }
        var packetManager = deps.packetManager, globalController = deps.globalController;
        _this.cursorTrack = host.createCursorTrack("Selected Track", "Selected Track", 0, 0, true);
        // this.cursorDevice.position().addValueObserver(() => {
        //     host.showPopupNotification('position changed')
        // })
        _this.cursorDevice = _this.cursorTrack.createCursorDevice();
        _this.deviceChain = _this.cursorDevice.deviceChain();
        _this.deviceBank = _this.deviceChain.createDeviceBank(DEVICE_BANK_SIZE);
        _this.cursorDevice.isExpanded().markInterested();
        _this.cursorDevice.isRemoteControlsSectionVisible().markInterested();
        _this.cursorDevice.exists().markInterested();
        _this.cursorDevice.slotNames().markInterested();
        _this.cursorDevice.name().markInterested();
        _this.cursorDevice.hasDrumPads().markInterested();
        _this.cursorDevice.hasLayers().markInterested();
        _this.cursorDevice.hasSlots().markInterested();
        _this.cursorLayer = _this.cursorDevice.createCursorLayer();
        _this.cursorDevice.getCursorSlot().name().markInterested();
        _this.cursorSlotDeviceBank = _this.cursorDevice.getCursorSlot().createDeviceBank(1);
        _this.cursorSlotDeviceBank.getDevice(0).exists().markInterested();
        _this.cursorLayerDeviceBank = _this.cursorLayer.createDeviceBank(1);
        _this.cursorLayerDeviceBank.getDevice(0).exists().markInterested();
        _this.layerBank = _this.cursorDevice.createLayerBank(LAYER_BANK_SIZE);
        _this.drumPadBank = _this.cursorDevice.createDrumPadBank(LAYER_BANK_SIZE);
        var selectedLayer = 0;
        var selectedDrumPad = 0;
        _this.layerBank.channelCount().markInterested();
        _this.drumPadBank.channelCount().markInterested();
        var _loop_1 = function (i) {
            var layer = this_1.layerBank.getChannel(i);
            layer.addIsSelectedInEditorObserver(function (selected) {
                if (selected) {
                    selectedLayer = i;
                }
            });
            var drumPad = this_1.layerBank.getChannel(i);
            drumPad.addIsSelectedInEditorObserver(function (selected) {
                if (selected) {
                    selectedDrumPad = i;
                }
            });
        };
        var this_1 = this;
        for (var i = 0; i < LAYER_BANK_SIZE; i++) {
            _loop_1(i);
        }
        var ensureDeviceSelected = function () {
            if (_this.cursorDevice.name().get().trim() === '') {
                _this.deviceBank.getDevice(0).selectInEditor();
            }
        };
        for (var i = 0; i < DEVICE_BANK_SIZE; i++) {
            var device = _this.deviceBank.getDevice(i);
            device.isExpanded().markInterested();
            device.isRemoteControlsSectionVisible().markInterested();
            device.exists().markInterested();
        }
        packetManager.listen('devices/chain/collapse', function () {
            _this.mapDevices(function (device) {
                device.isExpanded().set(false);
                device.isRemoteControlsSectionVisible().set(false);
            });
        });
        packetManager.listen('devices/chain/expand', function () {
            _this.mapDevices(function (device) {
                device.isExpanded().set(true);
            });
        });
        packetManager.listen('devices/selected/collapse', function () {
            _this.cursorDevice.isExpanded().set(false);
            _this.cursorDevice.isRemoteControlsSectionVisible().set(false);
        });
        packetManager.listen('devices/selected/expand', function () {
            _this.cursorDevice.isExpanded().set(true);
        });
        packetManager.listen('devices/selected/layers/select', function (_a) {
            var i = _a.data;
            ensureDeviceSelected();
            var recurseUp = function (levelsUp) {
                if (levelsUp === void 0) { levelsUp = 0; }
                if (levelsUp > 5) {
                    return;
                }
                var device = _this.cursorDevice;
                var hasLayers = device.hasLayers().get();
                var hasDrumPads = device.hasDrumPads().get();
                var withDrumPadsOrLayers = function (input) {
                    var alreadySelected = i == (hasLayers ? selectedLayer : selectedDrumPad);
                    if (alreadySelected) {
                        var firstDevice = _this.cursorLayerDeviceBank.getDevice(0);
                        if (firstDevice.exists().get()) {
                            _this.cursorLayerDeviceBank.getDevice(0).selectInEditor();
                        }
                        else {
                            input.getChannel(i).browseToInsertAtEndOfChain();
                        }
                    }
                    else {
                        if (i > input.channelCount().get() - 1) {
                            // TODO How do we insert a new layer here?
                            input.getChannel(i).startOfDeviceChainInsertionPoint().browse();
                        }
                        else {
                            input.getChannel(i).selectInEditor();
                        }
                    }
                };
                if (hasLayers) {
                    withDrumPadsOrLayers(_this.layerBank);
                }
                else if (hasDrumPads) {
                    withDrumPadsOrLayers(_this.drumPadBank);
                }
                else {
                    device.selectParent();
                    host.scheduleTask(function () {
                        recurseUp(levelsUp + 1);
                    }, 100);
                }
            };
            recurseUp();
        });
        packetManager.listen('devices/selected/slot/select', function (_a) {
            var i = _a.data;
            ensureDeviceSelected();
            var recurseUp = function (levelsUp) {
                var _a;
                if (levelsUp === void 0) { levelsUp = 0; }
                if (levelsUp > 5) {
                    return;
                }
                var deviceName = _this.cursorDevice.name().get();
                if (deviceName in _this.deviceSlotMaps) {
                    i = (_a = _this.deviceSlotMaps[deviceName][i]) !== null && _a !== void 0 ? _a : i;
                }
                var slotNames = _this.cursorDevice.slotNames().get();
                var slotName = slotNames[i];
                if (_this.cursorDevice.hasSlots()) {
                    var currentlySelected = _this.cursorDevice.getCursorSlot().name().get();
                    if (currentlySelected === slotName) {
                        var firstDevice = _this.cursorSlotDeviceBank.getDevice(0);
                        if (firstDevice.exists().get()) {
                            _this.cursorSlotDeviceBank.getDevice(0).selectInEditor();
                        }
                        else {
                            _this.cursorDevice.getCursorSlot().browseToInsertAtEndOfChain();
                        }
                    }
                    else {
                        _this.cursorDevice.getCursorSlot().selectSlot(slotName);
                    }
                }
                else {
                    _this.cursorDevice.selectParent();
                    host.scheduleTask(function () {
                        recurseUp(levelsUp + 1);
                    }, 100);
                }
            };
            recurseUp();
        });
        packetManager.listen('devices/selected/chain/insert-at-end', function () {
            ensureDeviceSelected();
            _this.cursorDevice.deviceChain().browseToInsertAtEndOfChain();
        });
        packetManager.listen('devices/selected/chain/insert-at-start', function () {
            ensureDeviceSelected();
            _this.cursorDevice.deviceChain().browseToInsertAtStartOfChain();
        });
        packetManager.listen('devices/selected/navigate-up', function () {
            _this.cursorDevice.selectParent();
        });
        packetManager.listen('devices/selected/layer/insert-at-end', function () {
            _this.cursorLayer.browseToInsertAtEndOfChain();
        });
        packetManager.listen('devices/selected/layer/select-first', function () {
            _this.cursorLayer.selectFirst();
        });
        return _this;
    }
    DeviceController.prototype.mapDevices = function (cb) {
        for (var i = 0; i < DEVICE_BANK_SIZE; i++) {
            var device = this.deviceBank.getDevice(i);
            if (device.exists().get()) {
                cb(device, i);
            }
        }
    };
    return DeviceController;
}(Controller));
var BrowserController = /** @class */ (function (_super) {
    __extends(BrowserController, _super);
    function BrowserController(deps) {
        var _this = _super.call(this, deps) || this;
        _this.isOpen = false;
        _this.columnData = [];
        var packetManager = deps.packetManager, globalController = deps.globalController;
        _this.popupBrowser = host.createPopupBrowser();
        var pb = _this.popupBrowser;
        var isOpenCb = function (cb) { return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            if (_this.isOpen)
                cb.apply(void 0, args);
        }; };
        var clearFilters = function () {
            for (var _i = 0, _a = _this.columnData; _i < _a.length; _i++) {
                var col = _a[_i];
                col.reset();
            }
        };
        pb.exists().markInterested();
        pb.exists().addValueObserver(function (exists) {
            _this.isOpen = exists;
            packetManager.send({
                type: "browser/state",
                data: {
                    isOpen: exists
                }
            });
        });
        pb.selectedContentTypeIndex().markInterested();
        var filterColumns = [
            pb.smartCollectionColumn(),
            pb.locationColumn(),
            pb.deviceColumn(),
            pb.categoryColumn(),
            pb.tagColumn(),
            pb.deviceTypeColumn(),
            pb.fileTypeColumn(),
            pb.creatorColumn(),
        ];
        var resultsItemBank = pb.resultsColumn().createItemBank(1);
        var resultsCursorItem = pb.resultsColumn().createCursorItem();
        resultsCursorItem.isSelected().markInterested();
        var selectIfNone = function () {
            if (!resultsCursorItem.isSelected().get()) {
                _this.popupBrowser.selectNextFile();
            }
        };
        _this.columnData = filterColumns.map(function (col) {
            var wildCard = col.getWildcardItem();
            wildCard.isSelected().markInterested();
            return {
                wildCard: wildCard,
                reset: function () { return wildCard.isSelected().set(true); }
            };
        });
        packetManager.listen('browser/confirm', isOpenCb(function () { return _this.popupBrowser.commit(); }));
        packetManager.listen('browser/select-and-confirm', isOpenCb(function () {
            selectIfNone();
            _this.popupBrowser.commit();
        }));
        packetManager.listen('browser/filters/clear', isOpenCb(function () {
            clearFilters();
            runAction('focus_browser_search_field');
        }));
        packetManager.listen('browser/tabs/next', isOpenCb(function () {
            pb.selectedContentTypeIndex().inc(1);
            clearFilters();
            selectIfNone();
            runAction('focus_browser_search_field');
        }));
        packetManager.listen('browser/tabs/set', isOpenCb(function (_a) {
            var data = _a.data;
            pb.selectedContentTypeIndex().set(data);
            clearFilters();
            selectIfNone();
            runAction('focus_browser_search_field');
        }));
        packetManager.listen('browser/tabs/previous', isOpenCb(function () {
            pb.selectedContentTypeIndex().inc(-1);
            clearFilters();
            selectIfNone();
            runAction('focus_browser_search_field');
        }));
        return _this;
    }
    return BrowserController;
}(Controller));
var SettingsController = /** @class */ (function (_super) {
    __extends(SettingsController, _super);
    function SettingsController(deps) {
        var _this = _super.call(this, deps) || this;
        var packetManager = deps.packetManager, globalController = deps.globalController;
        packetManager.listen('settings/update', function (_a) {
            var data = _a.data;
            settings = __assign(__assign({}, settings), data);
        });
        return _this;
    }
    return SettingsController;
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
                var name_1 = _this.trackHistory[_this.historyIndex].name;
                globalController.selectTrackWithName(name_1);
                host.showPopupNotification(name_1);
            }
        });
        packetManager.listen('tracknavigation/forward', function () {
            if (_this.historyIndex < _this.trackHistory.length - 1) {
                _this.ignoreSelectionChangesOnce = true;
                _this.historyIndex++;
                var name_2 = _this.trackHistory[_this.historyIndex].name;
                globalController.selectTrackWithName(name_2);
                host.showPopupNotification(name_2);
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
function convertBWColorToHex(color) {
    var red = color.red();
    var green = color.green();
    var blue = color.blue();
    var pad0 = function (input) { return input.length === 1 ? "0" + input : input; };
    var componentToHex = function (c) { return pad0(Math.round(c * 255).toString(16).substr(0, 2).toUpperCase()); };
    return "#" + componentToHex(red) + componentToHex(green) + componentToHex(blue);
}
function init() {
    // var app = host.createApplication()
    var transport = host.createTransport();
    app = host.createApplication();
    var arranger = host.createArranger();
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
    var deps = {
        app: app,
        arranger: arranger,
        transport: transport
    };
    deps.packetManager = new PacketManager({ app: app });
    deps.globalController = new GlobalController(deps);
    new TrackSearchController(deps);
    new BackForwardController(deps);
    new BrowserController(deps);
    new BugFixController(deps);
    new DeviceController(deps);
    new SettingsController(deps);
    deps.packetManager.listen('transport/play', function () { return transport.togglePlay(); });
    deps.packetManager.listen('transport/stop', function () { return transport.stop(); });
    host.showPopupNotification("BES Connecting...");
}
