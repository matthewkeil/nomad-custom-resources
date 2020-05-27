import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { createWriteStream, createReadStream } from "fs";
import { writeFile } from "fs/promises";
import { PassThrough } from "stream";
import { sep } from "path";
import { generate } from "shortid";
import {
  s3,
  getKey,
  getTemplateKey,
  BUILD_FOLDER,
  BUNDLE_PATH,
  BUCKET_NAME,
  BUCKET_PREFIX,
  FILENAME
} from "../config";
import { build } from "./build";
import { buildTemplate } from "../templates/buildTemplate";

import Archiver from "archiver";
const archive = Archiver("zip", { zlib: { level: 9 } });
archive.on("error", err => {
  console.log(err);
});

function streamToS3({ Key }: { Key: string }) {
  const pass = new PassThrough();
  s3.upload(
    { Bucket: BUCKET_NAME, Key, Body: pass, ACL: "public-read", ContentType: "application/zip" },
    (err, data) => {
      if (err) return void debug(err);
      debug(data);
    }
  );
  return pass;
}

export const deploy = async (params?: { Bucket?: string; Prefix?: string }) => {
  const { Bucket = BUCKET_NAME, Prefix = BUCKET_PREFIX } = params || {};
  const uuid = generate();
  const { Key } = getKey(uuid);
  debug({ params, Bucket, Prefix, uuid, Key });

  const zipFile = BUILD_FOLDER + sep + uuid + ".zip";
  archive.pipe(createWriteStream(zipFile));
  archive.pipe(streamToS3({ Key }));

  const templateName = uuid + ".json";
  const templatePath = BUILD_FOLDER + sep + templateName;
  const template = buildTemplate({ Bucket, Key: `${Key}.json` });
  archive.append(template, { name: "cloudformation.json" });
  const templateSave = writeFile(templatePath, JSON.stringify(JSON.parse(template)));
  const templateUpload = s3
    .putObject({
      Bucket,
      Key: getTemplateKey(),
      Body: template,
      ACL: "public-read"
    })
    .promise();

  await build();
  archive.append(createReadStream(BUNDLE_PATH), { name: FILENAME });
  await Promise.all([templateSave, templateUpload, archive.finalize()]);

  debug(`>>>
>>> built bundle: ${BUNDLE_PATH}
>>> and template: ${templatePath}
>>> zipped both: ${zipFile}
>>> to Bucket: ${Bucket}
>>> as Key: ${Key}
>>>`);

  return {
    uuid,
    zipFile,
    templatePath,
    Bucket,
    Key
  };
};

if (require.main === module) {
  deploy().then(console.log);
}
