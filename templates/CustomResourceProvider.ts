import { Lambda, Fn } from "cloudform";
import { getKey, BRANCH, BUCKET_NAME, BUNDLE_FILENAME, LAMBDA_TIMEOUT } from "../config";

let Environment;
if (typeof process.env.DEBUG === "string" && process.env.DEBUG.length) {
  Environment = {
    Variables: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      DEBUG: process.env.DEBUG
    }
  };
}

export const CustomResourceProvider = new Lambda.Function({
  Description: "Nomad Devops CloudFormation Custom::Respource Provider",
  FunctionName: "nomad-custom-resource-provider".concat(BRANCH ? `${BRANCH}` : ""),
  Role: Fn.GetAtt("CustomResourceProviderRole", "Arn"),
  Runtime: "nodejs12.x",
  Code: {
    S3Bucket: BUCKET_NAME,
    S3Key: getKey()
  },
  Timeout: LAMBDA_TIMEOUT,
  Handler: `${BUNDLE_FILENAME}.handler`,
  MemorySize: 128,
  Environment
}).dependsOn("CustomResourceProviderRole");
