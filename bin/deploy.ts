import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { sep } from "path";
import { Readable, PassThrough } from "stream";
import { createWriteStream, createReadStream } from "fs";
import { generate } from "shortid";
import Archiver from "archiver";
import {
  s3,
  getKey,
  getTemplateKey,
  BUILD_FOLDER,
  BUNDLE_PATH,
  BUCKET_NAME,
  BUCKET_PREFIX,
  NODE_ENV,
  FILENAME
} from "../config";
import { build } from "./build";
import { buildTemplate } from "../templates/buildTemplate";

const Bucket = BUCKET_NAME;
const Prefix = BUCKET_PREFIX;

const uploadPromises: Promise<any>[] = [];

function streamToS3({ Key }: { Key: string }) {
  const pass = new PassThrough();
  uploadPromises.push(
    s3
      .upload({ Bucket: BUCKET_NAME, Key, Body: pass, ACL: "public-read" }, (err, data) => {
        if (err) return void console.error(err);
        debug(data);
      })
      .promise()
      .then(() => {
        return debug(`finished uploading ${Key}`);
      })
  );
  return pass;
}

export const deploy = async (uuid = generate()) => {
  const { Key: zipKey } = getKey(uuid);
  debug({ NODE_ENV, BUILD_FOLDER, uuid, Bucket, Prefix, zipKey });

  const archive = Archiver("zip", { zlib: { level: 9 } });
  archive.on("error", err => {
    console.log(err);
  });

  const savePromises: Promise<any>[] = [];
  function saveFile(path: string) {
    const writeStream = createWriteStream(path);
    savePromises.push(
      new Promise(resolve => {
        writeStream.on("finish", () => {
          debug(`finished saving ${path}`);
          resolve();
        });
      })
    );
    return writeStream;
  }

  /**
   *
   * build zip archive and save to disk as {UUID}.zip
   * upload archive to s3 in same location that will be
   * specified in template below
   *
   */
  const zipPath = BUILD_FOLDER + sep + uuid + ".zip";
  archive.pipe(saveFile(zipPath));
  archive.pipe(streamToS3({ Key: zipKey }));

  /**
   *
   * Build template and specify Key where bundle is.
   *
   * Save template to local disk as {UUID}.json,
   * and upload as current template to default location
   *
   * Add template to bundle for long term versioned storage
   *
   */
  const template = buildTemplate({ Bucket, Key: zipKey });
  const templateKey = getTemplateKey();
  const templatePath = BUILD_FOLDER + sep + uuid + ".json";
  const templateStream = Readable.from(template);
  templateStream.pipe(saveFile(templatePath));
  archive.pipe(streamToS3({ Key: templateKey }));

  
  /**
   *
   * webpack.config.ts specifies output as /${BUNDLE_PATH}
   * make sure filename inside is same as one specified in template
   *
   * TODO: is there a way to get a streamed bundle from webpack?
   *
   */
  await build();
  archive.append(createReadStream(BUNDLE_PATH), { name: FILENAME });
  archive.append(template, { name: "cloudformation.json" });
  await Promise.all([...savePromises, ...uploadPromises, archive.finalize()]);

  console.log(`>>>
>>> built bundle: ${BUNDLE_PATH}
>>> and template: ${templatePath}
>>> zipped both: ${zipPath}
>>> to Bucket: ${Bucket}
>>> as Key: ${zipKey}
>>> and: ${templateKey}
>>>`);

  return {
    uuid,
    zipKey,
    zipPath,
    template,
    templateKey,
    templatePath
  };
};

if (require.main === module) {
  deploy().then(console.log);
}
