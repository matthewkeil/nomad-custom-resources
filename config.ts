import { Debug } from "./src/utils";
const debug = Debug(__dirname, __filename);
require("dotenv").config();
import { execSync } from "child_process";
import { resolve } from "path";
import { ACM, CloudFormation, Route53, S3 } from "aws-sdk";
import { generate } from "shortid";

export const getBranch = () => {
  const output = execSync("git status");
  const results = /^On\sbranch\s([\S]*).*/.exec(output.toString());
  if (!results) {
    throw new Error("Cannot determine what branch you are on");
  }
  return results[1];
};

export const BRANCH = getBranch();
export const DEBUG = typeof process.env.DEBUG === "string" && !!process.env.DEBUG.length;
export const PROD = process.env.NODE_ENV === "production";
const TEST = process.env.NODE_ENV === "test";

export const BUNDLE_FOLDER = process.env.BUNDLE_FOLDER || resolve(__dirname, "build");
export const BUNDLE_FILENAME = process.env.BUNDLE_FILENAME || "index.js";
export const BUNDLE_PATH = resolve(...[BUNDLE_FOLDER, BUNDLE_FILENAME]);

export const BUCKET_NAME = process.env.PUBLIC_BUCKET || "nomad-custom-resources";
const BUCKET_PREFIX_PROD = process.env.BUCKET_PREFIX_PROD || "resources/custom";
const BUCKET_PREFIX_TEST = process.env.BUCKET_PREFIX_TEST || "resources/testing";
const BUCKET_PREFIX_DEFAULT = process.env.BUCKET_PREFIX || "resources/dev";
export const BUCKET_PREFIX = PROD
  ? BUCKET_PREFIX_PROD
  : TEST
  ? BUCKET_PREFIX_TEST
  : BUCKET_PREFIX_DEFAULT;
export const BUNDLE_PREFIX = process.env.BUNDLE_PREFIX || "nomad-custom-resources";

let _uuid: string | number | undefined;
export const getKey = (uuid?: string | number) => {
  if (uuid && !_uuid) _uuid = uuid; // make sure no conflicting uuids submitted during run
  if (PROD && !_uuid) _uuid = generate(); // if prod and no uuid set create shortid
  const key = BUCKET_PREFIX + "/" + BUNDLE_PREFIX + (_uuid ? `-${_uuid}` : "");
  debug({ BUCKET_PREFIX, BUNDLE_PREFIX, uuid, key });
  return key;
};
export const LAMBDA_TIMEOUT = 300; // in seconds

const AWS_SERVICE_CONFIG = {
  region: process.env.REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
};
export const acm = new ACM(AWS_SERVICE_CONFIG);
export const cloudformation = new CloudFormation(AWS_SERVICE_CONFIG);
export const route53 = new Route53(AWS_SERVICE_CONFIG);
export const s3 = new S3(AWS_SERVICE_CONFIG);
