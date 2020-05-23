import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { generate } from "shortid";
import { promises } from "fs";
const { readFile } = promises;
import JSZip from "jszip";
const zip = new JSZip();
import { s3, getKey, BUNDLE_FILENAME, BUNDLE_PATH, BUCKET_NAME, BUCKET_PREFIX } from "../config";
import { build } from "./build";

interface DeployParams {
  Bucket?: string;
  Prefix?: string;
}

export const deploy = async (params?: DeployParams) => {
  const { Bucket = BUCKET_NAME, Prefix = BUCKET_PREFIX } = params || {};

  debug({ BUNDLE_PATH, params });
  await build();
  const bundle = readFile(BUNDLE_PATH);

  const { Contents = [] } = await s3.listObjects({ Bucket, Prefix }).promise();
  debug({ Contents });

  for (const obj of Contents) {
    debug(`deleting ${obj.Key}: `, obj);
    const results = await s3.deleteObject({ Bucket, Key: `${obj.Key}` }).promise();
    debug(results);
  }

  zip.file(BUNDLE_FILENAME, await bundle);

  const Key = getKey(generate());
  debug(">>>\n>>> attemplting to upload bundle Key: ", Key);

  await s3
    .putObject({
      Bucket,
      Key,
      ACL: "public-read",
      Body: zip.generateAsync({
        type: "binarystring",
        compression: "DEFLATE"
      })
    })
    .promise();

  debug(`>>>\n>>> uploaded Key: ${Key}\n>>> to Bucket: ${Bucket}\n>>>`);

  return {
    Bucket,
    Key
  };
};

if (require.main === module) {
  deploy().then(console.log);
}
