declare const host: any
declare const loadAPI: any
declare const println: any
declare const load: any
declare const Object2: any
declare const loadMods: any

loadAPI(10);
load('es5-shim.min.js')
load('json3.min.js')
load('Object2.js')

const log = (msg: string) => {
    const d = new Date()
    const pad0 = input => ('0' + input).substr(-2)
    println(`${d.getHours()}:${pad0(d.getMinutes())}:${pad0(d.getSeconds())}:` + msg)
}

const FX_TRACK_BANK_SIZE = 16
const MAIN_TRACK_BANK_SIZE = 128
const CUE_MARKER_BANK_SIZE = 32
const DEVICE_BANK_SIZE = 16
const LAYER_BANK_SIZE = 16

host.setShouldFailOnDeprecatedUse(false);
host.defineController("andy shand", "Modwig", "0.1", "b90a4894-b89c-40b9-b372-e1e8659699df", "andy shand");

let app: any
let connection: any
let settings = {
    exclusiveArm: true
}

type Packet = {
    type: string
} & any

class PacketError {
    constructor(public readonly code: number, public readonly message?: string) {}
}

class EventEmitter<T> {
    nextId = 0
    listenersById: {[id: number]: (data: T) => void} = {}
    listen(cb: (data: T) => void) {
        let nowId = this.nextId++
        this.listenersById[nowId] = cb
    }
    emit(value: T) {
        for (const listener of Object2.values(this.listenersById)) {
            listener(value)
        }
    }
}

function debounce(fn, wait = 1) {
    let id = 0
    return function(...args) {
        let waitingId = ++id
        host.scheduleTask(() => {
            if (id === waitingId) {
                fn(...args)
            }
        }, wait)
    }
}

function runAction(actionNames: string | string[]) {
    if (typeof actionNames === 'string') {
        actionNames = [actionNames]
    }
    for (const actionName of actionNames) {
        const action = app.getAction(actionName)
        if (action) {
            log(`Running action: ` + actionName)
            action.invoke()
        } else {
            host.showPopupNotification(`Action ${actionName} not found`)
        }
    }
}

class PacketManager {
    connection: any
    activeConnection: any
    listenersByType: {[type: string]: ((packet: Packet) => void)[]} = {}
    constructor({app}) {
        this.connection = connection
        log("Created remote connection on port: " + this.connection.getPort())
        this.connection.setClientConnectCallback(connection => {
            host.showPopupNotification("Modwig Connected");
            log("Connected to Node");
            this.activeConnection = connection
            this.activeConnection.setDisconnectCallback(() => {
                log("Disconnected from Node");
                host.showPopupNotification("Modwig Disconnected");
                this.activeConnection = null
            })
            this.activeConnection.setReceiveCallback(data => {
                try {
                    const str = bytesToString(data)
                    // log('string is ' + str)
                    const packet = JSON.parse(str)
                    // log('parsed the packet')
                    const listeners = this.listenersByType[packet.type] || []
                    let warnNoListeners = listeners.length === 0
                    if (packet.type === 'ping') {
                        return this.send({type: 'pong'})
                    }
                    if (packet.type === 'action') {
                        warnNoListeners = false
                        const actions = typeof packet.data === 'object' ? packet.data : [packet.data]
                        for (const actionName of actions) {
                            runAction(actionName)
                        }
                    }
                    log(`Received packet of type: ${packet.type}`)
                    // log('send response???')
                    let noAutoRespond = false
                    let errors = []
                    if (warnNoListeners) {
                        host.showPopupNotification('No listeners attached for packet type: ' + packet.type)
                    }
                    for (const listener of listeners) {
                        try {
                            const response = listener(packet) as any
                            if (response) {
                                this.send({
                                    id: packet.id,
                                    ...response
                                })
                            } else if (response === false) {
                                noAutoRespond = true
                            }
                        } catch (e) {
                            errors.push(e)
                            log(e)
                        }
                    }
                    if (!noAutoRespond) {
                        // Send back the packet with additional info so we have a way
                        // of tracking when things have been processed
                        this.send({
                            id: packet.id,
                            data: packet.data,
                            type: packet.type,
                            status: errors.length ? 500 : 200,
                            errors
                        })
                    }
                } catch(e) {
                    log(e)
                }            
            })
        });
    }
    listen(type: string, cb: (p: Packet) => void) {
        log(`Added packet listener for type: ${type}`)
        this.listenersByType[type] = this.listenersByType[type] || [].concat(cb)
    }
    replyWithData(packet: Packet, data: any) {
        this.send({
            type: packet.type,
            id: packet.id,
            data
        })
    }
    send(packet: Packet) {
        if (this.activeConnection) {
            const asString = JSON.stringify(packet)
            this.activeConnection.send(((asString.length + asString) as any).getBytes());
        }
    }
}

type Deps = {
    packetManager: PacketManager
    globalController: GlobalController,
    app: any,
    arranger: any,
    transport: any
}

class Controller {
    static controllers: {[name: string]: Controller} = {}
    static get(classs: any) : any {
        return Controller.controllers[classs.name]
    }
    constructor(public readonly deps: Deps) {
        Controller.controllers[this.constructor.name] = this;
    }
}

class GlobalController extends Controller {
    trackBank = host.createMainTrackBank(MAIN_TRACK_BANK_SIZE, 0, 0)
    fxBank = host.createEffectTrackBank(FX_TRACK_BANK_SIZE, 0)
    cursorTrack = host.createCursorTrack("selectedTrack", "selectedTrack", 0, 0, true)
    // cursorSiblingsTrackBank = this.cursorTrack.createcreateSiblingsTrackBank(16, 0, 0, true, false)
    cueMarkerBank: any
    lastSelectedTrack: string = ''
    masterTrack = host.createMasterTrack( 0 );
    nameCache: {[trackName: string]: any} = {}

    /**
     * Will get called whenever the name of the current track changes (most reliable way I know of)
     */
    selectedTrackChanged = new EventEmitter<string>()

    constructor(public readonly deps: Deps) {
        super(deps)

        const { packetManager } = deps
        packetManager.listen('track/update', ({ data: { name, volume, solo, mute }}) => {
            const track = this.findTrackByName(name)
            if (!track) {
                throw new PacketError(404, "Track not found")
            }
            if (volume !== undefined) {
                track.volume().set(volume)
            }
            if (solo !== undefined) {
                track.solo().set(solo)
            }
            if (mute !== undefined) {
                track.mute().set(mute)
            }
            return {
                type: 'track/update',
                data: this.createTrackInfo(track)
            }
        })
        packetManager.listen('track/select', ({ data: { name }}) => {
            this.selectTrackWithName(name)
        })
        this.deps.app.projectName().markInterested()

        packetManager.listen('application/undo', () => this.deps.app.undo())
        packetManager.listen('application/redo', () => this.deps.app.redo())

        this.cursorTrack.name().markInterested();
        this.cursorTrack.name().addValueObserver(value => {
            this.lastSelectedTrack = value
            this.selectedTrackChanged.emit(value)
        })

        this.mapTracks((t, i, isFX) => {
            t.name().markInterested()
            t.solo().markInterested()
            t.arm().markInterested()
            t.mute().markInterested()
            t.color().markInterested()
            t.position().markInterested()
            t.trackType().markInterested()
            t.volume().markInterested()
            t.volume().displayedValue().markInterested()
    
            // send all tracks when track name changes
            // hopefully this runs when new tracks are added
            t.name().addValueObserver(name => {
                this.nameCache = {}
                if (Controller.get(TrackSearchController).active) {
                    // Don't send track changes whilst highlighting search results
                    return
                }
                // Clear the name cache, could now be wrong
                this.sendAllTracks()
            })

            t.addIsSelectedInEditorObserver(selected => {
                if (selected) {
                    // this is basically the hook for when selected track changes

                    if (t.trackType().get() !== "Group") {
                        // Group tracks bug out when you make them visible,
                        // vertically centering on their child content and not 
                        // actually showing the group
                        // t.makeVisibleInArranger()
                    }
                }
                this.deps.packetManager.send({
                    type: 'trackselected',
                    data: {
                        selected,
                        ...this.createTrackInfo(t, isFX),
                        project: {name: this.deps.app.projectName().get()}
                    }
                })
            })
        })

        this.cueMarkerBank = this.deps.arranger.createCueMarkerBank(CUE_MARKER_BANK_SIZE)
        this.mapCueMarkers(marker => {
            marker.getName().markInterested()
            marker.getColor().markInterested()
            marker.position().markInterested()

            marker.getName().addValueObserver(name => {
                this.sendAllCueMarkers()
            })
        })

        // deps.transport.getPosition().addValueObserver(position => {
        //     this.deps.packetManager.send({
        //         type: 'transport',
        //         data: {
        //             position
        //         }
        //     })
        // })
    }

    mapCueMarkers<T>(cb: (cueMarker, i: number) => T, filterNull = false) {
        let out = []
        const processC = (cm, i) => {
            const result = cb(cm, i)
            if (!filterNull || result != null) {
                out.push(result)
            }
        }
        for (let i = 0; i < CUE_MARKER_BANK_SIZE; i++) {
            processC(this.cueMarkerBank.getItemAt(i), i)
        }
        return out
    }

    mapTracks<T>(cb: (track, i: number, isFX: boolean) => T, filterNull = false) {
        let out = []
        const processT = (track, i, isFX = false) => {
            const result = cb(track, i, isFX)
            if (!filterNull || result != null) {
                out.push(result)
            }
        }
        for (let i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            processT(this.trackBank.getItemAt(i), i)
        }
        for (let i = 0; i < FX_TRACK_BANK_SIZE; i++) {
            processT(this.fxBank.getItemAt(i), i + MAIN_TRACK_BANK_SIZE, true)
        }
        processT(this.masterTrack, MAIN_TRACK_BANK_SIZE + FX_TRACK_BANK_SIZE, false)
        return out
    }

    createTrackInfo(t, isFX: boolean = false) {
        const name = t.name().get()
        return {
            name,
            color: convertBWColorToHex(t.color()),
            solo: t.solo().get(),
            mute: t.mute().get(),
            position: t === this.masterTrack ? -1 : (t.position().get() + (isFX ? MAIN_TRACK_BANK_SIZE : 0)),
            volume: t.volume().get(),
            volumeString: t.volume().displayedValue().get(),
            type: t.trackType().get()
        }
    }

    createCueMarkerInfo(cueMarker) {
        return {
            name: cueMarker.getName().get(),
            position: cueMarker.position().get(),
            color: convertBWColorToHex(cueMarker.getColor())
        }
    }

    sendProject() {
        this.deps.packetManager.send({
            type: 'project',
            data: {
                name: this.deps.app.projectName().get()
            }
        })
    }

    sendAllTracks() {
        const tracks = this.mapTracks((t, i, isFX) => {
            const name = t.name().get()
            if (name.length === 0) return null
            return this.createTrackInfo(t)
        }, true)
        this.sendProject()
        this.deps.packetManager.send({
            type: 'tracks',
            data: tracks
        })
    }

    sendAllCueMarkers() {
        const cueMarkers = this.mapCueMarkers((cm, i) => {
            const name = cm.getName().get()
            if (name.length === 0) return null
            return this.createCueMarkerInfo(cm)
        }, true)
        this.deps.packetManager.send({
            type: 'cue-markers',
            data: cueMarkers
        })
    }

    addTrackToCache(name) {
        for (let i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            const t = this.trackBank.getItemAt(i)
            if (t.name().get() == name) {
                this.nameCache[name] = t
                return
            }
        }
        for (let i = 0; i < FX_TRACK_BANK_SIZE; i++) {
            const t = this.fxBank.getItemAt(i)
            if (t.name().get() == name) {
                this.nameCache[name] = t
                return
            }
        }
    }

    findTrackByName(name) {
        if (name === 'Master') {
            return this.masterTrack
        }
        if (!this.nameCache[name]) {
            this.addTrackToCache(name)
        }
        return this.nameCache[name]
    }

    selectTrackWithName(name, scroll = true) {
        const t = this.findTrackByName(name)
        t.selectInMixer()
        if (scroll) {
            t.makeVisibleInArranger()
        }
    }
}

class TrackSearchController extends Controller {
    trackSelectedWhenStarted: string = ''
    active = false
    constructor(deps) {
        super(deps)
        const { packetManager, globalController } = deps
        packetManager.listen('tracksearch/start', () => {
            this.trackSelectedWhenStarted = globalController.lastSelectedTrack
            this.active = true
            globalController.sendAllTracks()
            globalController.sendAllCueMarkers()
        })
        packetManager.listen('tracksearch/cancel', () => {
            if (this.trackSelectedWhenStarted.length > 0) {
                globalController.selectTrackWithName(this.trackSelectedWhenStarted)
            }
            this.active = false
        })
        packetManager.listen('tracksearch/highlighted', ({data: trackName}) => {
            globalController.selectTrackWithName(trackName)
        })
        packetManager.listen('tracksearch/confirm', ({data: trackName}) => {
            this.active = false
            globalController.selectTrackWithName(trackName)
        })
    }
}

class BugFixController extends Controller {
    trackSelectedWhenStarted: string = ''
    active = false
    constructor(deps) {
        super(deps)
        const wait = 40
        const { packetManager, globalController } = deps
        packetManager.listen('bugfix/buzzing', () => {
            globalController.mapTracks((track, i) => {
                host.scheduleTask(() => {
                    track.solo().set(true)
                }, wait * i)
                host.scheduleTask(() => {
                    track.solo().set(false)
                }, wait * i + wait)
            })
        })
    }
}

class DeviceController extends Controller {
    trackSelectedWhenStarted: string = ''
    active = false
    cursorDevice
    deviceChain
    deviceBank
    cursorTrack
    cursorLayer
    layerBank
    drumPadBank
    cursorSlotDeviceBank
    cursorLayerDeviceBank
    cursorTrackDeviceBank

    mapDevices(cb) {
        for (let i = 0; i < DEVICE_BANK_SIZE; i++) {
            const device = this.deviceBank.getDevice(i)
            if (device.exists().get()) {
                cb(device, i)
            }
        }
    }

    reverseSlots = [
        "Polysynth",
        "Phase-4",
        "Reverb",
        "FM-4",
        "Sampler"
    ]
    deviceSlotMaps = {
        'Multiband FX-3': {
            1: 2,
            2: 1
        },
        'Delay-4': {
            3: 2,
            2: 3
        }
    }

    constructor(deps) {
        super(deps)
        
        for (const device of this.reverseSlots) {
            this.deviceSlotMaps[device] = {
                0: 1,
                1: 0
            }
        }

        const { packetManager, globalController } = deps

        this.cursorTrack = host.createCursorTrack("Selected Track", "Selected Track", 0, 0, true)

        this.cursorDevice = this.cursorTrack.createCursorDevice()
        this.deviceChain = this.cursorDevice.deviceChain()
        this.deviceBank = this.deviceChain.createDeviceBank(DEVICE_BANK_SIZE)
        this.cursorTrackDeviceBank = this.cursorTrack.createDeviceBank(1)

        this.cursorDevice.isExpanded().markInterested()
        this.cursorDevice.isRemoteControlsSectionVisible().markInterested()
        this.cursorDevice.exists().markInterested()
        this.cursorDevice.slotNames().markInterested()
        this.cursorDevice.name().markInterested()
        this.cursorDevice.hasDrumPads().markInterested()
        this.cursorDevice.hasLayers().markInterested()
        this.cursorDevice.hasSlots().markInterested()
        
        this.cursorLayer = this.cursorDevice.createCursorLayer()

        this.cursorDevice.getCursorSlot().name().markInterested()
        this.cursorSlotDeviceBank = this.cursorDevice.getCursorSlot().createDeviceBank(1)
        this.cursorSlotDeviceBank.getDevice(0).exists().markInterested()
        
        this.cursorLayerDeviceBank = this.cursorLayer.createDeviceBank(1)
        this.cursorLayerDeviceBank.getDevice(0).exists().markInterested()
        
        this.layerBank = this.cursorDevice.createLayerBank(LAYER_BANK_SIZE)
        this.drumPadBank = this.cursorDevice.createDrumPadBank(LAYER_BANK_SIZE)
        let selectedLayer = 0 
        let selectedDrumPad = 0 

        this.layerBank.channelCount().markInterested()
        this.drumPadBank.channelCount().markInterested()

        for (let i = 0; i < LAYER_BANK_SIZE; i++) {
            const layer = this.layerBank.getChannel(i)
            layer.addIsSelectedInEditorObserver((selected) => {
                if (selected) {
                    selectedLayer = i
                }
            }) 
            const drumPad = this.layerBank.getChannel(i)
            drumPad.addIsSelectedInEditorObserver((selected) => {
                if (selected) {
                    selectedDrumPad = i
                }
            }) 
        }

        const ensureDeviceSelected = () => {
            if (this.cursorDevice.name().get().trim() === '') {
                this.cursorTrackDeviceBank.getDevice(0).selectInEditor()
            }            
        }

        for (let i = 0; i < DEVICE_BANK_SIZE; i++) {
            const device = this.deviceBank.getDevice(i)
            device.isExpanded().markInterested()
            device.isRemoteControlsSectionVisible().markInterested()
            device.exists().markInterested()
        }

        packetManager.listen('devices/chain/collapse', () => {
            this.mapDevices(device => {
                device.isExpanded().set(false)
                device.isRemoteControlsSectionVisible().set(false)
            })            
        })

        packetManager.listen('devices/chain/expand', () => {
            this.mapDevices(device => {
                device.isExpanded().set(true)
            })          
        })

        packetManager.listen('devices/selected/collapse', () => {
            this.cursorDevice.isExpanded().set(false)
            this.cursorDevice.isRemoteControlsSectionVisible().set(false)
        })
        
        packetManager.listen('devices/selected/expand', () => {
            this.cursorDevice.isExpanded().set(true)  
        })

        packetManager.listen('devices/selected/layers/select', ({ data: i }) => {
            ensureDeviceSelected()
           
            const recurseUp = (levelsUp = 0) => {
                if (levelsUp > 5) {
                    return
                }

                const device = this.cursorDevice
                const hasLayers = device.hasLayers().get()
                const hasDrumPads = device.hasDrumPads().get()

                const withDrumPadsOrLayers = (input) => {
                    const alreadySelected = i == (hasLayers ? selectedLayer : selectedDrumPad)
                    if (alreadySelected) {
                        const firstDevice = this.cursorLayerDeviceBank.getDevice(0)
                        if (firstDevice.exists().get()) {
                            this.cursorLayerDeviceBank.getDevice(0).selectInEditor()
                        } else {
                            input.getChannel(i).browseToInsertAtEndOfChain()
                        }
                    } else {
                        if (i > input.channelCount().get() - 1) {
                            // TODO How do we insert a new layer here?
                            input.getChannel(i).startOfDeviceChainInsertionPoint().browse()
                        } else {
                            input.getChannel(i).selectInEditor()
                        }
                    }
                    host.scheduleTask(() => {
                        this.cursorLayerDeviceBank.getDevice(0).selectInEditor()
                    }, 0)
                }
                if (hasLayers) {
                    withDrumPadsOrLayers(this.layerBank)
                } else if (hasDrumPads) {
                    withDrumPadsOrLayers(this.drumPadBank)
                } else {
                    device.selectParent()
                    host.scheduleTask(() => {
                        recurseUp(levelsUp + 1)
                    }, 100)
                }
            }
            recurseUp()
        })

        packetManager.listen('devices/selected/slot/select', ({ data: i }) => {
            ensureDeviceSelected()
            const recurseUp = (levelsUp = 0) => {
                if (levelsUp > 5) {
                    return
                }

                const deviceName = this.cursorDevice.name().get()
                if (deviceName in this.deviceSlotMaps) {
                    i = this.deviceSlotMaps[deviceName][i] ?? i
                }
        
                const slotNames = this.cursorDevice.slotNames().get()
                const slotName = slotNames[i]
                if (this.cursorDevice.hasSlots().get()) {
                    const currentlySelected = this.cursorDevice.getCursorSlot().name().get()
                    if (currentlySelected === slotName) {
                        const firstDevice = this.cursorSlotDeviceBank.getDevice(0)
                        if (firstDevice.exists().get()) {
                            this.cursorSlotDeviceBank.getDevice(0).selectInEditor()
                        } else {
                            this.cursorDevice.getCursorSlot().browseToInsertAtEndOfChain()
                        }
                    } else {
                        this.cursorDevice.getCursorSlot().selectSlot(slotName)
                    }
                } else {
                    this.cursorDevice.selectParent()
                    host.scheduleTask(() => {
                        recurseUp(levelsUp + 1)
                    }, 100)
                }
            }
            recurseUp()
        })

        packetManager.listen('devices/selected/chain/insert-at-end', () => {
            ensureDeviceSelected()
            this.cursorDevice.deviceChain().browseToInsertAtEndOfChain()
        })
        packetManager.listen('devices/selected/chain/insert-at-start', () => {
            ensureDeviceSelected()
            this.cursorDevice.deviceChain().browseToInsertAtStartOfChain()
        })

        packetManager.listen('devices/selected/navigate-up', () => {
            this.cursorDevice.selectParent()
        })

        packetManager.listen('devices/selected/layer/insert-at-end', () => {
            this.cursorLayer.browseToInsertAtEndOfChain()
        })

        packetManager.listen('devices/selected/layer/select-first', () => {
            this.cursorLayerDeviceBank.getDevice(0).selectInEditor()
        })

        packetManager.listen('tracks/selected/devices/select-first', () => {
            this.cursorTrackDeviceBank.getDevice(0).selectInEditor()
        })        
    }
}

class BrowserController extends Controller {
    popupBrowser: any
    isOpen = false
    columnData = []
    constructor(deps) {
        super(deps)
        const { packetManager, globalController } = deps
        this.popupBrowser = host.createPopupBrowser()
        const pb = this.popupBrowser
        const isOpenCb = cb => (...args) => {
            if (this.isOpen) cb(...args)
        }
        const clearFilters = () => {
            for (const col of this.columnData) {
                col.reset()
            }
        }
        pb.exists().markInterested()
        pb.exists().addValueObserver(exists => {
            this.isOpen = exists
            packetManager.send({
                type: "browser/state", 
                data: {
                    isOpen: exists
                }
            })
        })
        pb.selectedContentTypeIndex().markInterested()
        const filterColumns = [
            pb.smartCollectionColumn(),
            pb.locationColumn(),
            pb.deviceColumn(),
            pb.categoryColumn(),
            pb.tagColumn(),
            pb.deviceTypeColumn(),
            pb.fileTypeColumn(),
            pb.creatorColumn(),
            // pb.resultsColumn()
        ]
        const resultsItemBank = pb.resultsColumn().createItemBank(1)
        const resultsCursorItem = pb.resultsColumn().createCursorItem()
        resultsCursorItem.isSelected().markInterested()
        const selectIfNone = () => {
            if (!resultsCursorItem.isSelected().get()) {
                this.popupBrowser.selectNextFile()
            }
        }
       
        this.columnData = filterColumns.map(col => {
            const wildCard = col.getWildcardItem()
            wildCard.isSelected().markInterested()
            return {
                wildCard,
                reset: () =>  wildCard.isSelected().set(true)
            }
        })
        
        packetManager.listen('browser/confirm', isOpenCb(() => this.popupBrowser.commit()))
        packetManager.listen('browser/select-and-confirm', isOpenCb(() => {
            selectIfNone()
            this.popupBrowser.commit()
        }))
        packetManager.listen('browser/filters/clear', isOpenCb(() => {
            clearFilters()
            runAction('focus_browser_search_field')
        }))
        packetManager.listen('browser/tabs/next', isOpenCb(() => {
            pb.selectedContentTypeIndex().inc(1)
            clearFilters()
            selectIfNone()
            runAction('focus_browser_search_field')
        }))
        packetManager.listen('browser/tabs/set', isOpenCb(({ data }) => {
            pb.selectedContentTypeIndex().set(data)
            clearFilters()
            selectIfNone()
            runAction('focus_browser_search_field')
        }))
        packetManager.listen('browser/tabs/previous', isOpenCb(() => {
            pb.selectedContentTypeIndex().inc(-1)
            clearFilters()
            selectIfNone()
            runAction('focus_browser_search_field')
        }))
    }
}

class SettingsController extends Controller {
    constructor(deps) {
        super(deps)
        const { packetManager, globalController } = deps
        packetManager.listen('settings/update', ({ data }) => {
            for (const key in data) {
                settings[key] = data[key]
            }
        })
    }
}

class BackForwardController extends Controller {
    trackHistory: {name: string}[] = []
    historyIndex = -1
    ignoreSelectionChangesOnce = false
    
    constructor(deps) {
        super(deps)
        const { packetManager, globalController } = deps
        globalController.selectedTrackChanged.listen(this.onSelectedTrackChanged)
        packetManager.listen('tracknavigation/back', () => {
            if (this.historyIndex > 0) {
                this.ignoreSelectionChangesOnce = true
                this.historyIndex--
                const name = this.trackHistory[this.historyIndex].name
                globalController.selectTrackWithName(name)
                host.showPopupNotification(name)
            }
        })
        packetManager.listen('tracknavigation/forward', () => {
            if (this.historyIndex < this.trackHistory.length - 1) {
                this.ignoreSelectionChangesOnce = true
                this.historyIndex++
                const name = this.trackHistory[this.historyIndex].name
                globalController.selectTrackWithName(name)
                host.showPopupNotification(name)
            }
        })
    }

    onSelectedTrackChanged = (name: string) => {
        if (Controller.get(TrackSearchController).active) {
            // Don't record track changes whilst highlighting search results
            return
        }
        if (name.trim().length == 0 || this.ignoreSelectionChangesOnce) {
            this.ignoreSelectionChangesOnce = false
            return
        }
        while (this.trackHistory.length > 50) {
            this.trackHistory.splice(0, 1)
            this.historyIndex--
        }
        this.trackHistory = this.trackHistory.slice(0, this.historyIndex + 1)
        // log('track name changed to ' + value)
        this.trackHistory.push({ name })
        this.historyIndex++
    }
}

function bytesToString(data) {
    var clientData = "";
    for (var i = 0; i < data.length; i++) {
        clientData += String.fromCharCode(data[i])
    }
    return clientData;
};

function convertBWColorToHex(color) {
    const red = color.red()
    const green = color.green()
    const blue = color.blue()
    let pad0 = input => input.length === 1 ? `0${input}` : input
    const componentToHex = c => pad0(Math.round(c * 255).toString(16).substr(0, 2).toUpperCase())
    return `#${componentToHex(red)}${componentToHex(green)}${componentToHex(blue)}`
}

let waitingOnFlush = []
function flush() {
    for (const cb of waitingOnFlush) {
        cb()
    }
    waitingOnFlush = []
}

function onFlush(cb) {
    waitingOnFlush.push(cb)
    host.requestFlush()
}

function init() {
    // var app = host.createApplication()
    const transport = host.createTransport()
    app = host.createApplication()
    const arranger = host.createArranger()

    connection = host.createRemoteConnection("name", 8888)
    log("Created the host")

    // fix for bug that doesn't reset automation at specific point
    transport.getPosition().markInterested()
    transport.playStartPosition().markInterested()
    let isPlaying = false
    transport.isPlaying().addValueObserver(yesOrNo => {
        if (yesOrNo) {
            isPlaying = true
        } else if (isPlaying) {
            isPlaying = false
            transport.getPosition().set(transport.playStartPosition().get())
        }
    })

    let deps: Deps = {
        app,
        arranger,
        transport
    } as any
    deps.packetManager = new PacketManager({app})
    deps.globalController = new GlobalController(deps)
    
    new TrackSearchController(deps)    
    new BackForwardController(deps)    
    new BrowserController(deps)    
    new BugFixController(deps)    
    new DeviceController(deps)    
    new SettingsController(deps)    

    deps.packetManager.listen('transport/play', () => transport.togglePlay())
    deps.packetManager.listen('transport/stop', () => transport.stop())
    deps.packetManager.listen('message', ({data: message}) => {
        log(message)
        host.showPopupNotification(message)
    })
    deps.packetManager.listen('actions', () => {
        const actions = app.getActions()
        let out = []
        for (const action of actions) {
            out.push(action)
        }
        return {
            type: 'actions',
            data: out.map(action => {
                return {
                    id: action.getId(),
                    name: action.getName(),
                    description: action.getMenuItemText(),
                    category: action.getCategory().getName()
                }
            })
        }
    })

    load('mods.js')
    const makeApi = () => {
        return {
            tracks: {
                forEach: ((cb) => {
                    deps.globalController.mapTracks(cb)
                }),
                map: (cb) => {
                    return deps.globalController.mapTracks(cb)
                }
            },
            cursorTrack: deps.globalController.cursorTrack,
            // cursorSiblingsTrackBank: deps.globalController.cursorSiblingsTrackBank,
            settings,
            runAction,
            log: (msg: string) => {
                deps.packetManager.send({
                    type: 'log',
                    data: msg
                })
                println(msg)
            },
            findTrackByName: deps.globalController.findTrackByName.bind(deps.globalController),
            transport,
            ...deps,
            afterUpdates: (fn) => host.scheduleTask(fn, 25),
            onFlush,
            debounce
        }
    }
    loadMods(makeApi())
}