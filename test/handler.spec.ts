import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { sep } from "path";
import { unlink, writeFile } from "fs/promises";
import { generate } from "shortid";
import JSZip from "jszip";
import { deploy } from "../bin/deploy";
import { BUILD_FOLDER, FILENAME, BUCKET_NAME, BUCKET_PREFIX, BUNDLE_PATH, s3 } from "../config";

const Bucket = BUCKET_NAME;
let uuid!: string;
let zipKey!: string;
let zipPath!: string;
let template!: string;
let templateKey!: string;
let templatePath!: string;
const tempS3: string[] = [];
const tempFiles: string[] = [];
const RUN_PREFIX = generate();
debug({ RUN_PREFIX });

beforeAll(done => {
  jest.setTimeout(60000);
  deploy().then(response => {
    ({ uuid, zipKey, zipPath, template, templatePath, templateKey } = response);
    tempS3.push(zipKey, templateKey);
    tempFiles.push(zipPath, templatePath);
    done();
  });
});

it("build/deploy should be setup correctly", async done => {
  expect.assertions(9);
  expect(Bucket).toEqual(BUCKET_NAME);
  expect(zipKey.startsWith(BUCKET_PREFIX)).toBeTruthy();
  expect(!!uuid).toBeTruthy();

  console.log({ Bucket, zipKey });
  const { ContentType, Body } = await s3.getObject({ Bucket, Key: zipKey }).promise();
  const zip = await JSZip.loadAsync(Body);
  expect(ContentType).toEqual("application/octet-stream");

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
  debug({ outFile: zipPath, templatePath, BUNDLE_PATH, Key: zipKey });
  const tempDeletePromises: Promise<any>[] = tempFiles.map(unlink);
  const s3DeletePromises: Promise<any>[] = tempS3.map(Key =>
    s3.deleteObject({ Bucket, Key }).promise()
  );

  await Promise.all([...s3DeletePromises, ...tempDeletePromises]);
  done();
});
