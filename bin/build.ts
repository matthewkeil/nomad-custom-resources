import JSZip from "jszip";
import { resolve } from "path";
import { promisify } from "util";
import { exec, execSync } from "child_process";
import { exists as EXISTS, readFile as READ_FILE } from "fs";
import { config } from "../config";

const zip = new JSZip();
const exists = promisify(EXISTS);
const readFile = promisify(READ_FILE);

const BUNDLE_FILENAME = "index.js";
const BUNDLE = resolve(__dirname, "..", "build", BUNDLE_FILENAME);

interface DeployParams {
  Bucket: string;
  Key: string;
}

const deploy = async ({ Bucket, Key }: DeployParams) => {
  console.log("running build command");
  const buildProcess = exec("npm run webpack");
  buildProcess.stdout?.pipe(process.stdout);
  buildProcess.stderr?.pipe(process.stderr);
  buildProcess.on("close", async (code) => {
    if (!!code) throw new Error("build process ended with code: " + code);
    const bundle = await readFile(BUNDLE);
    zip.file("index.js", bundle);
    console.log(">>>\n>>> attemplting to upload bundle");
    await config.s3
      .putObject({
        Bucket,
        Key,
        ACL: "public-read",
        Body: await zip.generateAsync({ type: "nodebuffer" }),
      })
      .promise();

    console.log(
      `>>>\n>>> uploaded ${BUNDLE}\n>>> to Bucket: ${config.PUBLIC_BUCKET}\n>>> at Key: ${config.BUNDLE_KEY}\n>>>`
    );
  });
};

if (require.main === module) {
  deploy({
    Bucket: config.PUBLIC_BUCKET,
    Key: config.BUNDLE_KEY,
  }).then(console.log);
}
