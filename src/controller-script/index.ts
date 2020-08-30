declare const host: any
declare const loadAPI: any
declare const println: any
declare const load: any
declare const Object2: any

loadAPI(10);
load('es5-shim.min.js')
load('json3.min.js')
load('Object2.js')

const FX_TRACK_BANK_SIZE = 16
const MAIN_TRACK_BANK_SIZE = 128
const CUE_MARKER_BANK_SIZE = 32

host.setShouldFailOnDeprecatedUse(true);
host.defineController("andy shand", "Bitwig Enhancement Suite", "0.1", "b90a4894-b89c-40b9-b372-e1e8659699df", "andy shand");

let connection: any

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

class PacketManager {
    connection: any
    activeConnection: any
    listenersByType: {[type: string]: ((packet: Packet) => void)[]} = {}
    constructor({app}) {
        this.connection = connection
        println("Created remote connection on port: " + this.connection.getPort())
        this.connection.setClientConnectCallback(connection => {
            host.showPopupNotification("BES Connected");
            println("Connected to Node");
            this.activeConnection = connection
            this.activeConnection.setDisconnectCallback(() => {
                println("Disconnected from Node");
                host.showPopupNotification("BES Disconnected");
                this.activeConnection = null
            })
            this.activeConnection.setReceiveCallback(data => {
                try {
                    const str = bytesToString(data)
                    // println('string is ' + str)
                    const packet = JSON.parse(str)
                    // println('parsed the packet')
                    const listeners = this.listenersByType[packet.type] || []
                    if (packet.type === 'ping') {
                        return this.send({type: 'pong'})
                    }
                    if (packet.type === 'action') {
                        const action = app.getAction(packet.data)
                        if (action) {
                            action.invoke()
                        } else {
                            host.showPopupNotification(`Action ${packet.data} not found`)
                        }
                    }
                    // host.showPopupNotification(packet.type)
                    // println('send response???')
                    let errors = []
                    for (const listener of listeners) {
                        try {
                            const response = listener(packet) as any
                            if (response) {
                                this.send({
                                    id: packet.id,
                                    ...response
                                })
                            }
                        } catch (e) {
                            errors.push(e)
                            println(e)
                        }
                    }
                    // Send back the packet with additional info so we have a way
                    // of tracking when things have been processed
                    this.send({
                        id: packet.id,
                        data: packet.data,
                        type: packet.type,
                        status: errors.length ? 500 : 200,
                        errors
                    })
                } catch(e) {
                    println(e)
                }            
            })
        });
    }
    listen(type: string, cb: (p: Packet) => void) {
        this.listenersByType[type] = this.listenersByType[type] || [].concat(cb)
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
    globalController: Controller,
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

            // Exclusive arm
            t.arm().addValueObserver(armed => {
                if (armed) {
                    // Unarm all other tracks
                    this.mapTracks((t, i2) => {
                        if (i !== i2) {
                            t.arm().set(false);
                        }
                    })
                }
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

        deps.transport.getPosition().addValueObserver(position => {
            this.deps.packetManager.send({
                type: 'transport',
                data: {
                    position
                }
            })
        })
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

    selectTrackWithName(name) {
        const t = this.findTrackByName(name)
        t.selectInMixer()
        t.makeVisibleInArranger()
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
        // println('track name changed to ' + value)
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

function init() {
    // var app = host.createApplication()
    const transport = host.createTransport()
    const app = host.createApplication()
    const arranger = host.createArranger()

    connection = host.createRemoteConnection("name", 8888)
    println("Created the host")

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

    deps.packetManager.listen('transport/play', () => transport.togglePlay())
    deps.packetManager.listen('transport/stop', () => transport.stop())
}