import { send, sendPromise } from "../../bitwig-api/Bitwig";

export async function getSettings({category}) {
    return sendPromise({
        type: `api/shortcuts/category`,
        data: {category}
    })
}