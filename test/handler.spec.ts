import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { sep } from "path";
import { unlink, writeFile } from "fs/promises";
import { generate as Generate } from "shortid";
const generate = () => Generate().replace(/-_/g, `${Math.floor(Math.random() * 10)}`);
import JSZip from "jszip";
import { deploy } from "../bin/deploy";
import { BUILD_FOLDER, FILENAME, BUCKET_NAME, BUCKET_PREFIX, BUNDLE_PATH, s3 } from "../config";
import { deleteTestStack, createTestStack } from "./utils";

const Bucket = BUCKET_NAME;
let uuid!: string;
let zipKey!: string;
let zipPath!: string;
let templateKey!: string;
let templatePath!: string;
const tempS3: string[] = [];
const tempFiles: string[] = [];
const RUN_PREFIX = generate();
debug({ RUN_PREFIX });

jest.setTimeout(240000);
beforeAll(done => {
  deploy().then(response => {
    ({ uuid, zipKey, zipPath, templatePath, templateKey } = response);
    tempS3.push(zipKey, templateKey);
    tempFiles.push(zipPath, templatePath);
    done();
  });
});

it("build/deploy should be setup correctly", async done => {
  expect.assertions(11);
  expect(Bucket).toEqual(BUCKET_NAME);
  expect(zipKey.startsWith(BUCKET_PREFIX)).toBeTruthy();
  expect(!!uuid).toBeTruthy();

  const { ContentType, Body } = await s3.getObject({ Bucket, Key: zipKey }).promise();
  const zip = await JSZip.loadAsync(Body);
  expect(ContentType).toEqual("application/octet-stream");

  const testBundle = BUILD_FOLDER + sep + `${uuid}.zip`;
  await writeFile(testBundle, await zip.file(FILENAME + ".js").async("nodebuffer"));
  tempFiles.push(testBundle);

  const testTemplate = BUILD_FOLDER + sep + `${uuid}.json`;
  await writeFile(testTemplate, await zip.file("cloudformation.json").async("nodebuffer"));
  tempFiles.push(testTemplate);

  let bundle: any;
  expect(() => (bundle = require(testBundle))).not.toThrow();
  expect(typeof bundle.handler).toEqual("function");
  expect(bundle.handler.length).toEqual(2);
  expect(typeof bundle.mockHandler).toEqual("function");
  expect(bundle.mockHandler.length).toEqual(2);

  let template: any;
  expect(() => (template = require(testTemplate))).not.toThrow();
  expect(template.AWSTemplateFormatVersion).toEqual("2010-09-09");
  done();
});

it("should deploy", async () => {
  let results = await createTestStack("should-deploy");
  expect(results?.StackStatus).toEqual("CREATE_COMPLETE");
  results = await deleteTestStack("should-deploy");
  expect(results?.StackStatus).toEqual("DELETE_COMPLETE");
});

it("should fall back to dead letter que", () => {});

afterAll(async done => {
  debug({ outFile: zipPath, templatePath, BUNDLE_PATH, Key: zipKey });
  const tempDeletePromises: Promise<any>[] = tempFiles.map(unlink);
  const s3DeletePromises: Promise<any>[] = tempS3.map(Key =>
    s3.deleteObject({ Bucket, Key }).promise()
  );
  await Promise.all([...s3DeletePromises, ...tempDeletePromises]);
  done();
});
