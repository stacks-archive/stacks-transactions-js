const path = require('path');

module.exports = env => {
  env = env || {};

  const opts = {
    entry: './src/index.ts',
    devtool: 'source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      extensions: [ '.tsx', '.ts', '.js' ],
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'stacks-transactions.js',
      library: 'StacksTransactions',
      libraryTarget: 'umd',
      globalObject: 'this'
    },
    plugins: [],
  };

  if (process.env.ANALYZE || env.ANALYZE) {
    const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
    opts.plugins.push(new BundleAnalyzerPlugin());
  }

  return opts;
}
