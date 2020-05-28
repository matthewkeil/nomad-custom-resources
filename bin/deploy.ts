import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { sep } from "path";
import { Readable, PassThrough } from "stream";
import { createWriteStream, createReadStream } from "fs";
import { generate as Generate } from "shortid";
const generate = () => Generate().replace(/-_/g, `${Math.floor(Math.random() * 10)}`);
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
  FILENAME,
  DLQ_PATH,
  DLQ_FILENAME
} from "../config";
import { build } from "./build";
import { buildTemplate } from "../templates/buildTemplate";

const Bucket = BUCKET_NAME;
const Prefix = BUCKET_PREFIX;

export const deploy = async (uuid = generate()) => {
  const buildPromise = build();
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

  const uploadPromises: Promise<any>[] = [];
  function streamToS3({ Key }: { Key: string }) {
    const pass = new PassThrough();
    uploadPromises.push(
      s3
        .upload({ Bucket: BUCKET_NAME, Key, Body: pass, ACL: "public-read" })
        .promise()
        .then(() => {
          return debug(`finished uploading ${Key}`);
        })
    );
    return pass;
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
  const templateStream = Readable.from(template);

  const templatePath = BUILD_FOLDER + sep + uuid + ".json";
  templateStream.pipe(saveFile(templatePath));
  const templateKey = getTemplateKey();
  templateStream.pipe(streamToS3({ Key: templateKey }));

  archive.append(template, { name: "cloudformation.json" });

  /**
   *
   * webpack.config.ts specifies output as /${BUNDLE_PATH}
   * make sure filename inside is same as one specified in template
   *
   * TODO: is there a way to get a streamed bundle from webpack?
   *
   */
  await buildPromise;
  archive.append(createReadStream(BUNDLE_PATH), { name: FILENAME + ".js" });
  archive.append(createReadStream(DLQ_PATH), { name: DLQ_FILENAME + ".js" });
  await Promise.all([...savePromises, ...uploadPromises, archive.finalize()]);

  console.log(`>>>
>>> built handler bundle: ${BUNDLE_PATH}
>>> built dlq bundle: ${DLQ_PATH}
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
