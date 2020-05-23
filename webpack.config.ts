import { resolve } from "path";
import { Configuration } from "webpack";
import { BUNDLE_FOLDER, BUNDLE_FILENAME } from "./config";

const PROD = process.env.NODE_ENV === "production";

const config: Configuration = {
  mode: PROD ? "production" : "development",
  target: "node",
  devtool: PROD ? undefined : "eval-source-map",
  entry: resolve(__dirname, "src", "handler.ts"),
  output: {
    path: BUNDLE_FOLDER,
    filename: BUNDLE_FILENAME,
    libraryTarget: "commonjs"
  },
  resolve: {
    modules: ["node_modules"],
    extensions: [".ts", ".js", ".json"]
  },
  externals: [],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
            options: {
              configFile: "tsconfig.prod.json"
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
  }
};

export default config;
