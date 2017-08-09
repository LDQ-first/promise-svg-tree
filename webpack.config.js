const webpack = require('webpack')
const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')


const extractCSS = new ExtractTextPlugin({
    filename: 'css/main.[name].[contenthash:8].css'
})



module.exports = {
    devtool: 'source-map',
    entry: {
        main: './app/index.js'
    },
    output: {
        path: path.join(__dirname , 'dist'),
        filename: 'js/[name].[hash:8].js'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader?cacheDirectory=true'
            },
            {
                test: /\.css$/,
                exclude: /node_modules/,
                use: extractCSS.extract({
                    fallback: 'style-loader',
                    use: [{
                        loader: 'css-loader'
                    }]
                })
            }
        ]
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
        extractCSS,
        new webpack.LoaderOptionsPlugin({
            options: {
                postcss: require('autoprefixer')
            }
        }),
        new HtmlWebpackPlugin({
            template: __dirname + "/app/index.html"
        }),
        new webpack.NamedModulesPlugin(),
        new webpack.optimize.CommonsChunkPlugin({
            name: 'manifest'
        }),
        new CleanWebpackPlugin(['dist'])
    ],
    devServer: {
        historyApiFallback: true,
        hot: true,
        inline: true,
        port: 5050
    }


}