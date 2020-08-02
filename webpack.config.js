const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const isWebpackDevServer = process.argv[1].indexOf('webpack-dev-server') !== -1
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require('webpack')
const src = path.join(__dirname, 'src')
const port = process.env.PORT || 8080
const { version } = require('./package.json')
const mode = isWebpackDevServer ? "development" : "production"

module.exports = {
    mode,
    target: 'electron-renderer',
    devServer: {
        historyApiFallback: true,
        contentBase: "./",
        hot: true,
        host: "0.0.0.0",
        headers: {
            'Access-Control-Allow-Origin': "*"
        },
        clientLogLevel: "error",
        stats: "minimal",
        port
    },
    optimization: {
        // We no not want to minimize our code.
        minimize: false
    },
    entry: {
        app: [
            isWebpackDevServer ? `webpack-dev-server/client?http://localhost:${port}` : null,
            path.join(__dirname, "./src/renderer/index.tsx")
        ].filter(e => !!e)
    },
    output: {
        path: path.join(__dirname, "./build"),
        filename: "[name].js",
        publicPath: isWebpackDevServer ? '/' : '../build'
    },
    devtool: "sourcemap",
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css'
        }),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'src', 'renderer', 'index.html'),

            // Appends unique hash to each resource, helps with cache busting in production
            hash: !isWebpackDevServer
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.DefinePlugin({
            'process.env.VERSION': JSON.stringify(version),
            'process.env.PLATFORM': JSON.stringify(process.env.PLATFORM)
        })
    ],
    module: {
        rules: [
            { test: /\.tsx?$/, loader: "ts-loader", include: src },
            {
                test: /\.css$/,
                use: [
                    isWebpackDevServer ? 'style-loader' : MiniCssExtractPlugin.loader,
                    'css-loader'
                ],
                include: src
            }, {
                test: /\.scss$/,
                include: src,
                use: [
                    isWebpackDevServer ? 'style-loader' : MiniCssExtractPlugin.loader,
                    'css-loader',
                    'sass-loader',
                    'import-glob-loader'
                ]
            }, {
                test: /\.(jpe?g|png|gif)$/i,
                include: src,
                use: [
                    'file-loader',
                    'image-webpack-loader'
                ]
            }, {
                test: /\.(ttf|eot|otf|woff|woff2)$/i,
                use: 'file-loader'
            }, {
                test: /\.svg$/,
                exclude: /node_modules/,
                loader: 'svg-react-loader',
                query: {
                    classIdPrefix: '[name]-[hash:8]__',
                    filters: [
                        // function (value) {
                        //     // ...
                        //     this.update(newvalue);
                        // }
                    ],
                    propsMap: {
                        fillRule: 'fill-rule',
                        foo: 'bar'
                    },
                    xmlnsTest: /^xmlns.*$/
                }
            }
        ].filter(s => !!s)
    },
    resolve: {
        extensions: [
            ".ts",
            ".tsx",
            ".js",
            ".jsx"
        ],
        modules: [
            "node_modules"
        ],
        symlinks: false
    }
}
