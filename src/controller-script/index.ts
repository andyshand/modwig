declare const host: any
declare const loadAPI: any
declare const println: any
declare const load: any
declare const Object2: any

loadAPI(10);
load('es5-shim.min.js')
load('json3.min.js')
load('Object2.js')

const FX_TRACK_BANK_SIZE = 32
const MAIN_TRACK_BANK_SIZE = 128

host.setShouldFailOnDeprecatedUse(true);
host.defineController("andy shand", "Bitwig Enhancement Suite", "0.1", "b90a4894-b89c-40b9-b372-e1e8659699df", "andy shand");

let connection: any

type Packet = {
    type: string
} & any

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
    constructor() {
        this.connection = connection
        println("Created remote connection on port: " + this.connection.getPort())
        this.connection.setClientConnectCallback(connection => {
            println("Connected to Node");
            this.activeConnection = connection
            this.activeConnection.setDisconnectCallback(() => {
                println("Disconnected from Node");
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
                    // println('send response???')
                    for (const listener of listeners) {
                        try {
                            listener(packet)
                        } catch (e) {
                            println(e)
                        }
                    }
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
    globalController: Controller
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
    trackBank = host.createTrackBank(MAIN_TRACK_BANK_SIZE, 0, 0)
    cursorTrack = host.createCursorTrack("selectedTrack", "selectedTrack", 0, 0, true)
    lastSelectedTrack: string = ''
    
    /**
     * Will get called whenever the name of the current track changes (most reliable way I know of)
     */
    selectedTrackChanged = new EventEmitter<string>()

    constructor(public readonly deps: Deps) {
        super(deps)

        this.cursorTrack.name().markInterested();
        this.cursorTrack.name().addValueObserver(value => {
            this.lastSelectedTrack = value
            this.selectedTrackChanged.emit(value)
        })

        for (let i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            const t = this.trackBank.getItemAt(i)
            t.name().markInterested()
            t.solo().markInterested()
            t.mute().markInterested()
            t.color().markInterested()
            t.position().markInterested()
            t.volume().markInterested()

            // send all tracks when track name changes
            // hopefully this runs when new tracks are added
            t.name().addValueObserver(name => {
                println(Controller.get(TrackSearchController).active)
                if (Controller.get(TrackSearchController).active) {
                    // Don't send track changes whilst highlighting search results
                    return
                }
                this.sendAllTracks()
            })
        }
    }

    mapTracks<T>(cb: (track, i) => T) {
        let out = []
        for (let i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            const t = this.trackBank.getItemAt(i)
            out.push(cb(t, i))
        }
        return out
    }

    sendAllTracks() {
        const tracks = this.mapTracks((t, i) => {
            return {
                name: t.name().get(),
                solo: t.solo().get(),
                mute: t.mute().get(),
                color: t.color().get(),
                position: t.position().get(),
                volume: t.volume().get()
            }
        }) 
        this.deps.packetManager.send({
            type: 'tracks',
            data: tracks
        })
    }

    selectTrackWithName(name) {
        for (let i = 0; i < MAIN_TRACK_BANK_SIZE; i++) {
            const t = this.trackBank.getItemAt(i)
            if (t.name().get() == name) {
                t.selectInMixer()
                t.makeVisibleInArranger()
                return
            }
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
        packetManager.listen('tracknavigation/back', ({data: trackName}) => {
            if (this.historyIndex > 0) {
                this.ignoreSelectionChangesOnce = true
                this.historyIndex--
                globalController.selectTrackWithName(this.trackHistory[this.historyIndex].name)
            }
        })
        packetManager.listen('tracknavigation/forward', ({data: trackName}) => {
            if (this.historyIndex < this.trackHistory.length - 1) {
                this.ignoreSelectionChangesOnce = true
                this.historyIndex++
                globalController.selectTrackWithName(this.trackHistory[this.historyIndex].name)
            }
        })
    }

    onSelectedTrackChanged(name: string) {
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

function init() {
    // var app = host.createApplication()
    const transport = host.createTransport()
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

    let deps: Deps = {} as any
    deps.packetManager = new PacketManager()
    deps.globalController = new GlobalController(deps)
    
    new TrackSearchController(deps)    
}