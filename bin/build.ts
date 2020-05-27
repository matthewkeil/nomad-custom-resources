import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { exec } from "child_process";
import { PROD, TEST } from "../config";

export const build = async (
  env: "development" | "testing" | "production" = PROD
    ? "production"
    : TEST
    ? "testing"
    : "development"
) => {
  await new Promise((resolve, reject) => {
    console.log("running build command");
    const buildProcess = exec(`NODE_ENV=${env} npm run webpack`);
    buildProcess.stdout?.pipe(process.stdout);
    buildProcess.stderr?.pipe(process.stderr);
    buildProcess.on("err", err => {
      debug(err);
      buildProcess.removeAllListeners();
      reject(err);
    });
    buildProcess.on("close", async code => {
      debug({ code });
      buildProcess.removeAllListeners();
      if (!!code) return reject(new Error("build process ended with code: " + code));
      resolve();
    });
  });
};

if (require.main === module) {
  build()
    .then(console.log)
    .catch(console.error);
}
