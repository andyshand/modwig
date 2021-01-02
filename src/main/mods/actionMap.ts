export const bitwigActionMap = {
    'loop selected region': 'Loop Selection',
    'play': 'Play Transport',
    'play transport from start': 'Play Transport From Start',
    'jump to playback start time': 'jump_to_playback_start_time'
}

export function normalizeBitwigAction(action: string) {
    return bitwigActionMap[action.toLowerCase()] || action
}