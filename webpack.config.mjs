import path from 'node:path';
import { fileURLToPath } from 'node:url';

import CopyPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { GenerateSW } from 'workbox-webpack-plugin';

const root = path.dirname(fileURLToPath(import.meta.url));

export default (env, argv) => {
  const production = argv.mode === 'production';

  return {
    entry: './src/index.tsx',

    output: {
      path: path.join(root, 'dist'),
      // Hashed names let S3/CloudFront cache scripts and styles forever; only
      // index.html needs a short cache lifetime.
      filename: production ? '[name].[contenthash].js' : '[name].js',
      // Relative URLs, so dist/ works at a bucket root or under any prefix.
      publicPath: 'auto',
      clean: true
    },

    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        '@': path.join(root, 'src')
      }
    },

    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            // tsconfig.json sets noEmit for `npm run typecheck`; the loader has to emit.
            options: { compilerOptions: { noEmit: false } }
          }
        },
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader']
        }
      ]
    },

    plugins: [
      new HtmlWebpackPlugin({ template: './src/index.html' }),
      new MiniCssExtractPlugin({
        filename: production ? '[name].[contenthash].css' : '[name].css'
      }),
      // The wasm module and its Emscripten glue are loaded at runtime, not bundled.
      // The glue ships as .js because S3 uploads often label .mjs as
      // binary/octet-stream, which browsers refuse to run as a module. It is
      // already optimised by Emscripten, so it is copied as-is, not re-minified.
      new CopyPlugin({
        patterns: [
          {
            from: 'public',
            to: ({ absoluteFilename }) => (absoluteFilename.endsWith('.mjs') ? '[path][name].js' : '[path][name][ext]'),
            info: { minimized: true },
            globOptions: { ignore: ['**/.DS_Store'] }
          }
        ]
      }),
      // Offline support for the installed PWA: precaches every emitted file,
      // including the copied wasm module, and serves index.html for navigations
      // so ?expr= share links open offline too.
      ...(production
        ? [
            new GenerateSW({
              swDest: 'sw.js',
              navigateFallback: 'index.html',
              exclude: [/\.map$/, /LICENSE\.txt$/],
              // exprtk.wasm is ~1.6 MB, close to Workbox's 2 MB default limit.
              maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
              cleanupOutdatedCaches: true,
              clientsClaim: true,
              skipWaiting: true
            })
          ]
        : [])
    ],

    devtool: production ? 'source-map' : 'eval-source-map',

    devServer: {
      port: 3000,
      // public/ is served through CopyPlugin's output, so dev matches dist/.
      static: false,
      hot: true
    },

    performance: {
      // React alone is ~190 KB minified, just under webpack's 244 KB default.
      maxEntrypointSize: 400 * 1024,
      maxAssetSize: 400 * 1024,
      // exprtk.wasm is well over any sensible hint and is expected to be.
      assetFilter: (file) => !file.endsWith('.wasm') && !file.endsWith('.map')
    }
  };
};
