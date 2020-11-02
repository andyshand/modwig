/**
 * @name Ensure Unique Names
 * @id ensure-unique-names.modwig
 * @description Ensures all tracks have unique names, working better with modwig.
 * @category global
 * @noReload
 */

Mod.registerAction({
    title: "Rename All Tracks",
    id: "rename-all.ensure-unique-names.modwig",
    category: "global",
    description: `Rename all visible tracks ensuring uniqueness.`,
    defaultSetting: {
        keys: ["R"],
        fn: true
    },
    action: () => {
        Bitwig.sendPacket({type: 'rename-all.ensure-unique-names.modwig'})
    }
})