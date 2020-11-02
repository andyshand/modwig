const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const isWebpackDevServer = process.argv[1].indexOf('webpack-dev-server') !== -1
const webpack = require('webpack')
const port = process.env.PORT || 8081
const { version } = require('./package.json')
const mode = isWebpackDevServer ? "development" : "production"
const src = path.join(__dirname, 'src', 'renderer')

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
        path: path.join(__dirname, "./dist"),
        filename: "[name].js",
        publicPath: isWebpackDevServer ? '/' : '../dist'
    },
    devtool: "sourcemap",
    plugins: [
        new HtmlWebpackPlugin({
            template: path.join(__dirname, 'src', 'renderer', 'index.html'),

            // Appends unique hash to each resource, helps with cache busting in production
            hash: !isWebpackDevServer
        }),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.DefinePlugin({
            'process.env.VERSION': JSON.stringify(version),
            'process.env.PLATFORM': JSON.stringify(process.env.PLATFORM)
        }),
        new MiniCssExtractPlugin({
            filename: 'styles.css',
        })
    ],
    module: {
        rules: [
            {
                test: /\.(ts|js)x?$/,
                use: [
                  { 
                    loader: 'babel-loader'
                  },
                  {
                    loader: 'linaria/loader',
                    options: {
                      sourceMap: process.env.NODE_ENV !== 'production',
                    },
                  }
                ],
            },
            {
                test: /\.css$/,
                use: [
                  {
                    loader: MiniCssExtractPlugin.loader,
                    options: {
                      hmr: process.env.NODE_ENV !== 'production',
                    },
                  },
                  {
                    loader: 'css-loader',
                    options: {
                      sourceMap: process.env.NODE_ENV !== 'production',
                    },
                  },
                ],
              },
        ]
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
