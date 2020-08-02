
interface Location {
    x: number,
    y: number
}

interface ClickOptions {
    // defaults to drue
    returnHome?: boolean
}
const DefaultClickOptions: ClickOptions = {
    returnHome: true
}

export class UI {
    leftClick(loc: Location, opts?: ClickOptions) {

    }
    rightClick(loc: Location, opts?: ClickOptions) {

    }
    pixelAt(loc: Location) {

    }
    searchAdjacentPixels(start: Location, opts: any) {

    }
    readText(loc: Location): string {
        return null
    }
}