const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const isWebpackDevServer = process.argv[1].indexOf('webpack-dev-server') !== -1
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require('webpack')
const src = path.join(__dirname, 'src')
const port = process.env.PORT || 8080
const mode = isWebpackDevServer ? "development" : "production"
const nodeExternals = require('webpack-node-externals');

module.exports = {
    mode,
    target: 'electron-main',
    entry: {
        app: [path.join(__dirname, "./src/main/index.ts")]
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'main.js'
    },
    optimization: {
        // We no not want to minimize our code.
        minimize: false
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                loader: "ts-loader",
                options: {
                    configFile: 'tsconfig.server.json',
                    // forceIsolatedModules: true,
                    // useTranspileModule: true
                },
                include: src,
                exclude: [
                    /node_modules/,
                    path.join(__dirname, "src/renderer")
                ]
            }
        ]
    },
    resolve: {
        // Add '.ts' and '.tsx' as resolvable extensions.
        modules: ["node_modules"],
        extensions: [".ts", ".tsx", ".js", ".json"]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
        })
    ],
    node: {
        __dirname: false,
        __filename: false
    },
    externals: [nodeExternals({
        whitelist: ['typeorm']
    })]
}
