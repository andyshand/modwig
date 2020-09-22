import { send, sendPromise } from "../../bitwig-api/Bitwig";

export async function getSettings({category}) {
    return sendPromise({
        type: `api/settings/category`,
        data: {category}
    })
}