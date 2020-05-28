import { Debug } from "./src/utils";
const debug = Debug(__dirname, __filename);
require("dotenv").config();
import { resolve } from "path";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { ACM, CloudFormation, Route53, S3 } from "aws-sdk";
import { generate as Generate } from "shortid";
const generate = () => Generate().replace(/-_/g, `${Math.floor(Math.random() * 10)}`);

export const getBranch = () => {
  const output = execSync("git status");
  const results = /^On\sbranch\s([\S]*).*/.exec(output.toString());
  if (!results) {
    throw new Error("Cannot determine what branch you are on");
  }
  return results[1];
};

export const BRANCH = process.env.BRANCH || getBranch();
export const DEBUG = typeof process.env.DEBUG === "string" && !!process.env.DEBUG.length;
export const NODE_ENV = process.env.NODE_ENV || "development";
export const PROD = NODE_ENV === "production";
export const TEST = NODE_ENV === "testing";

const DIST = process.env.DIST_FOLDER || resolve(__dirname, "dist");
const BUILD = process.env.BUILD_FOLDER || resolve(__dirname, "build");
export const BUILD_FOLDER = PROD ? DIST : BUILD;
export const FILENAME = process.env.BUNDLE_FILENAME || "index";
export const BUNDLE_PATH = resolve(...[BUILD_FOLDER, FILENAME + ".js"]);
export const DLQ_FILENAME = process.env.BUNDLE_FILENAME || "deadLetterQue";
export const DLQ_PATH = resolve(...[BUILD_FOLDER, DLQ_FILENAME + ".js"]);

try {
  if (!existsSync(BUILD_FOLDER)) {
    mkdirSync(BUILD_FOLDER);
  }
} catch {}

export const BUCKET_NAME = process.env.PUBLIC_BUCKET || "nomad-devops";
const BUCKET_PREFIX_PROD = process.env.BUCKET_PREFIX_PROD || "resources/custom";
const BUCKET_PREFIX_TEST = process.env.BUCKET_PREFIX_TEST || "resources/testing";
const BUCKET_PREFIX_DEFAULT =
  process.env.BUCKET_PREFIX || process.env.BUCKET_PREFIX_DEFAULT || "resources/dev";
export const BUCKET_PREFIX = PROD
  ? BUCKET_PREFIX_PROD
  : TEST
  ? BUCKET_PREFIX_TEST
  : BUCKET_PREFIX_DEFAULT;

export const getKey = (uuid?: string, testId?: string) => {
  const _uuid = uuid ? uuid : generate(); // if prod and no uuid set create shortid
  let key = BUCKET_PREFIX + "/" + _uuid;
  if (testId) key += `/${testId}`;
  debug({ BUCKET_PREFIX, uuid, testId, key });
  return {
    Prefix: BUCKET_PREFIX,
    uuid,
    testId,
    Key: key
  };
};

export const getTemplateKey = () => {
  return `${BUCKET_PREFIX}/cloudformation`;
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
