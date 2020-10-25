#!/usr/bin/env node

const fs = require('fs')
const execSync = require('child_process').execSync
const cprops = {
    configurations: [
      {
        name: "Win32",
        defines: [
          "${default}"
        ],
        macFrameworkPath: [
          "${default}"
        ],
        forcedInclude: [
          "${default}"
        ],
        compileCommands: "${default}",
        browse: {
          "limitSymbolsToIncludedHeaders": true,
          "databaseFilename": "${default}",
          "path": [
            "${default}"
          ]
        },
        intelliSenseMode: "${default}",
        cStandard: "${default}",
        cppStandard: "${default}",
        compilerPath: "${default}"
      }
    ],
    version: 4
}
cprops.configurations[0].includePath = [
    execSync('which node').toString().trim().replace(/bin/, 'include'),
    "${workspaceFolder}/node_modules/node-addon-api",
    "${default}"
]
fs.writeFileSync('.vscode/c_cpp_properties.json', JSON.stringify(cprops, null, 2))