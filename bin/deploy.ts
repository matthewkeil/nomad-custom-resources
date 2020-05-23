import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { promises, createWriteStream, createReadStream } from "fs";
import { PassThrough } from "stream";
import { sep } from "path";
import { generate } from "shortid";
import {
  s3,
  getKey,
  BUNDLE_FOLDER,
  BUNDLE_PATH,
  BUCKET_NAME,
  BUCKET_PREFIX,
  BUNDLE_FILENAME
} from "../config";
import { build } from "./build";

import Archiver from "archiver";
const archive = Archiver("zip", { zlib: { level: 9 } });
archive.on("error", err => {
  console.log(err);
});

function streamToS3({ Key }: { Key: string }) {
  const pass = new PassThrough();
  s3.upload({ Bucket: BUCKET_NAME, Key, Body: pass }, (err, data) => {
    if (err) return void console.error(err);
    console.log(data);
  });
  return pass;
}

async function deleteOldBundles({ Bucket, Prefix }: { Bucket: string; Prefix: string }) {
  /**
   * delete old deployed packages in the folder
   */
  const { Contents = [] } = await s3.listObjects({ Bucket, Prefix }).promise();
  debug({ Contents });
  for (const obj of Contents) {
    debug(`deleting ${obj.Key}: `, obj);
    const results = await s3.deleteObject({ Bucket, Key: `${obj.Key}` }).promise();
    debug(results);
  }
}

export const deploy = async (params?: { Bucket?: string; Prefix?: string }) => {
  await build();
  const { Bucket = BUCKET_NAME, Prefix = BUCKET_PREFIX } = params || {};
  // await deleteOldBundles({ Bucket, Prefix });
  const uuid = generate();
  const Key = getKey(uuid);
  const outFile = BUNDLE_FOLDER + sep + uuid + ".zip";
  debug({ params, Bucket, Prefix, uuid, Key, outFile });

  archive.pipe(createWriteStream(outFile));
  archive.pipe(streamToS3({ Key }));
  archive.append(createReadStream(BUNDLE_PATH), { name: BUNDLE_FILENAME });
  await archive.finalize();

  debug(`>>>\n>>> uploaded Key: ${Key}\n>>> to Bucket: ${Bucket}\n>>>`);

  return {
    Bucket,
    Key
  };
};

if (require.main === module) {
  deploy().then(console.log);
}
