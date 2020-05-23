import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { generate } from "shortid";
import { promises } from "fs";
import { promisify } from "util";
const { readFile } = promises;
import JSZip from "jszip";
const zip = new JSZip();
import { s3, getKey, BUNDLE_PATH, BUCKET_NAME, BUCKET_PREFIX, BUNDLE_FILENAME } from "../config";
import { build } from "./build";

interface DeployParams {
  Bucket?: string;
  Prefix?: string;
}

export const deploy = async (params?: DeployParams) => {
  const { Bucket = BUCKET_NAME, Prefix = BUCKET_PREFIX } = params || {};

  const { Contents = [] } = await s3.listObjects({ Bucket, Prefix }).promise();
  debug({ Contents });

  for (const obj of Contents) {
    debug(`deleting ${obj.Key}: `, obj);
    const results = await s3.deleteObject({ Bucket, Key: `${obj.Key}` }).promise();
    debug(results);
  }

  debug({ BUNDLE_PATH, params });
  await build();

  const bundle = await readFile(BUNDLE_PATH);
  const Key = getKey(generate());
  const Body = await zip.file(BUNDLE_FILENAME, bundle).generateAsync({
    type: "binarystring",
    mimeType: "application/javascript",
    compression: "DEFLATE"
  });
  debug(">>>\n>>> attemplting to upload bundle Key: ", Key);

  await s3
    .putObject({
      Bucket,
      Key,
      ACL: "public-read",
      Body
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
