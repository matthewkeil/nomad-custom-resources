import { resolve } from "path";
import { Configuration } from "webpack";
import UglifyJsPlugin from "uglifyjs-webpack-plugin";
import { PROD, BUILD_FOLDER, FILENAME } from "./config";

const config: Configuration = {
  mode: PROD ? "production" : "development",
  target: "node",
  entry: {
    [FILENAME]: resolve(__dirname, "src", "handler.ts"),
    deadLetterQue: resolve(__dirname, "src", "deadLetterQue.ts")
  },
  output: {
    path: BUILD_FOLDER,
    filename: "[name].js",
    libraryTarget: "commonjs"
  },
  resolve: {
    modules: ["node_modules"],
    extensions: [".ts", ".js", ".json"]
  },
  externals: ["aws-sdk"],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.webpack.json"
            }
          }
        ]
      },
      {
        test: /\.js$/,
        use: [
          {
            loader: "shebang-loader"
          }
        ]
      }
    ]
  },
  optimization: {
    minimizer: [new UglifyJsPlugin()]
  }
};

if (PROD) {
  config.devtool = "eval-source-map";
}

export default config;
