import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { sep } from "path";
import { unlink, writeFile } from "fs/promises";
import { generate } from "shortid";
import JSZip from "jszip";
import { deploy } from "../bin/deploy";
import {
  BUILD_FOLDER,
  FILENAME,
  BUCKET_NAME,
  BUCKET_PREFIX,
  BUNDLE_PATH,
  s3,
  cloudformation,
  getTemplateUrl
} from "../config";
import { createStack } from "nomad-devops";

const RUN_PREFIX = generate();
debug({ RUN_PREFIX });

let uuid!: string;
let zipFile!: string;
let templatePath!: string;
let Bucket!: string;
let Key!: string;
const tempFiles: string[] = [];
beforeAll(done => {
  jest.setTimeout(60000);
  deploy().then(response => {
    uuid = response.uuid;
    zipFile = response.zipFile;
    templatePath = response.templatePath;
    Bucket = response.Bucket;
    Key = response.Key;
    tempFiles.push(BUNDLE_PATH, zipFile, templatePath);
    done();
  });
});
xit("build/deploy should be setup correctly", async done => {
  expect.assertions(3);
  expect(Bucket).toEqual(BUCKET_NAME);
  expect(Key.startsWith(BUCKET_PREFIX)).toBeTruthy();
  expect(!!uuid).toBeTruthy();

  const { ContentType, Body } = await s3.getObject({ Bucket, Key }).promise();
  expect(ContentType).toEqual("application/octet-stream");
  const zip = await JSZip.loadAsync(Body);
  const testBundle = BUILD_FOLDER + sep + `${uuid}.zip`;
  await writeFile(testBundle, await zip.file(FILENAME).async("nodebuffer"));
  tempFiles.push(testBundle);
  const testTemplate = BUILD_FOLDER + sep + `${uuid}.json`;
  await writeFile(testTemplate, await zip.file("cloudformation.json").async("nodebuffer"));
  tempFiles.push(testTemplate);
  let bundle: any;
  expect(() => (bundle = require(testBundle))).not.toThrow();
  expect(typeof bundle.handler).toEqual("function");
  expect(bundle.handler.length).toEqual(2);
  let template: any;
  expect(() => (template = require(testTemplate))).not.toThrow();
  expect(template.AWSTemplateFormatVersion).toEqual("2010-09-09");
  done();
});
// it("should deploy", async () => {
//   const results = await createStack({
//     StackName: "just-a-test",
//     Capabilities: ["CAPABILITY_NAMED_IAM"],
//     TemplateURL: getTemplateUrl(Key + ".json")
//   });

//   console.log(results);
// });
afterAll(async done => {
  debug({ outFile: zipFile, templatePath, BUNDLE_PATH, Key });
  const tempDeletePromises: Promise<any>[] = tempFiles.map(unlink);
  const s3BundleDelete = s3
    .deleteObject({
      Bucket,
      Key
    })
    .promise();
  const s3TemplateDelete = s3
    .deleteObject({
      Bucket,
      Key: Key + ".json"
    })
    .promise();
  await Promise.all([s3BundleDelete, s3TemplateDelete, ...tempDeletePromises]);
  await s3
    .deleteObject({
      Bucket,
      Key
    })
    .promise();
  await s3
    .deleteObject({
      Bucket,
      Key: Key + ".json"
    })
    .promise();
  done();
});
