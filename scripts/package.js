const packager = require('electron-packager')
const path = require('path')
const { execSync } = require('child_process')

packager({
    dir: path.join(__dirname, '..'),
    platform: process.env.PLATFORM,
    arch: process.env.ARCH,
    asar: true,
    out: path.join(__dirname, '..', '..', 'producer-tools-app'),
    overwrite: true,
    afterPrune: [
        (buildPath, electronVersion, platform, arch, cb) => {
            const packageJSON = require(path.join(buildPath, 'package.json'))

            const match = [/^react/, /^@fortawesome/, /^@babel/, 'moment', 'core-js', 'styled-components', 'csstype', 'highlight.js', 'lodash']
            const packagesToRemove = Object.keys(packageJSON.dependencies).filter(key => {
                let matchOne = false
                for (const m of match) {
                    if (typeof m === 'string') {
                        matchOne = key === m
                    } else {
                        matchOne = m.test(key)
                    }
                    if (matchOne) {
                        return true
                    }
                }
                return matchOne
            })

            for (const p of packagesToRemove) {
                const command = `rm -rf ./node_modules/${p}`
                console.log('Running ' + command)
                execSync(command, { cwd: buildPath })
            }

            execSync(`rm -rf scripts src .vscode .gitignore tsconfig.json tsconfig.server.json tslint.json webpack.config.js webpack.server.js yarn.lock README.md FEATURES.md package-lock.json`, { cwd: buildPath })
            cb()
        }
    ]
})