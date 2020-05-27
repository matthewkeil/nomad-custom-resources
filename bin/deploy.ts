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
  FILENAME,
  PROD
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

  // add archive version of template to bundle for long term storage
  // and upload most current template to default template location
  const templateName = uuid + ".json";
  const templatePath = BUILD_FOLDER + sep + templateName;
  const templateKey = getTemplateKey();
  let template = buildTemplate({ Bucket, Key });
  // minify template in production
  if (PROD) template = JSON.stringify(JSON.parse(template));
  archive.append(template, { name: "cloudformation.json" });
  const templateSave = await writeFile(templatePath, template);
  const templateUpload = s3
    .putObject({
      Bucket,
      Key: templateKey,
      Body: template,
      ACL: "public-read"
    })
    .promise();

  // build process outputs /${BUNDLE_PATH}/${FILENAME} as the primary artifact
  // TODO: is there a way to get a streamed bundle from webpack?
  await build();
  archive.append(createReadStream(BUNDLE_PATH), { name: FILENAME });
  await Promise.all([templateSave, templateUpload, archive.finalize()]);

  debug(`>>>
>>> built bundle: ${BUNDLE_PATH}
>>> and template: ${templatePath}
>>> zipped both: ${zipFile}
>>> to Bucket: ${Bucket}
>>> as Key: ${Key}
>>> and: ${templateKey}
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
