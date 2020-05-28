import { Lambda, Fn } from "cloudform";
import { FILENAME, TEST } from "../config";

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
  FunctionName: Fn.Join("", ["nomad-custom-resource-provider", Fn.Ref("UUID")]),
  Role: Fn.GetAtt("CustomResourceProviderRole", "Arn"),
  Runtime: "nodejs12.x",
  Code: {
    S3Bucket: Fn.Ref("S3Bucket"),
    S3Key: Fn.Ref("S3Key")
  },
  Timeout: Fn.Ref("LambdaTimeout"),
  Handler: `${FILENAME}.${TEST ? "mockHandler" : "handler"}`,
  MemorySize: 128,
  Environment
}).dependsOn("CustomResourceProviderRole");
