const { Bitwig } = require('bindings')('bes')

Bitwig.isActiveApplication()
Bitwig.isPluginWindowActive()
Bitwig.makeMainWindowActive()
Bitwig.getPluginWindowsPosition()