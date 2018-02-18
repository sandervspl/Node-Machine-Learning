const webpack = require('webpack');
const config = require('./webpack.config');

module.exports = Object.assign({}, config, {
    devtool: 'cheap-source-map',
    plugins: [
        webpack.optimize.UglifyJsPlugin({
            compress: {
                warnings: false,
                comments: true,
            },
        }),
    ],
});
