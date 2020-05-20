import { Debug } from "../src/debug";
const debug = Debug(__dirname, __filename);
import { exec } from "child_process";
import { resolve } from "path";
import { promisify } from "util";
import { writeFileSync, readFile as READ_FILE } from "fs";
const readFile = promisify(READ_FILE);
const ZIP = require("node-zip");
import { generate } from "shortid";
import { config } from "../config";
const zip = new ZIP();

const BUNDLE_FILENAME = "index.js";
const BUNDLE = resolve(__dirname, "..", "build", BUNDLE_FILENAME);
const KEY_PREFIX = "resources/custom";

interface DeployParams {
  Bucket: string;
  Key: string;
}

const deploy = async ({ Bucket }: DeployParams) => {
  console.log("running build command");
  const buildProcess = exec("npm run webpack");
  buildProcess.stdout?.pipe(process.stdout);
  buildProcess.stderr?.pipe(process.stderr);
  buildProcess.on("close", async code => {
    if (!!code) throw new Error("build process ended with code: " + code);

    const bundle = await readFile(BUNDLE);
    zip.file(BUNDLE_FILENAME, bundle);

    debug("bundle zipped. listing old bundle to delete");
    const { Contents = [] } = await config.s3.listObjects({ Bucket, Prefix: KEY_PREFIX }).promise();
    debug({ Contents });
    for (const obj of Contents) {
      debug(`deleting ${obj.Key}: `, obj);
      const results = await config.s3.deleteObject({ Bucket, Key: `${obj.Key}` }).promise();
      debug(results);
    }

    console.log(">>>\n>>> attemplting to upload bundle");
    const id = generate();
    const Key = `${KEY_PREFIX}/${id}`;
    const zipFile = resolve(__dirname, "..", "build", `${id}.zip`);

    writeFileSync(zipFile, zip.generate({ base64: false, compression: "DEFLATE" }), "binary");

    await config.s3
      .putObject({
        Bucket,
        Key,
        ACL: "public-read",
        Body: await readFile(zipFile)
      })
      .promise();

    console.log(
      `>>>\n>>> uploaded ${BUNDLE}\n>>> to Bucket: ${config.PUBLIC_BUCKET}\n>>> at Key: ${Key}\n>>>`
    );
  });
};

if (require.main === module) {
  deploy({
    Bucket: config.PUBLIC_BUCKET,
    Key: config.BUNDLE_KEY
  }).then(console.log);
}
