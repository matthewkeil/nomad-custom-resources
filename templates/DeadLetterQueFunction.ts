import { Lambda, Fn } from "cloudform";
import { DLQ_FILENAME } from "../config";

let Environment;
if (typeof process.env.DEBUG === "string" && process.env.DEBUG.length) {
  Environment = {
    Variables: {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      DEBUG: process.env.DEBUG
    }
  };
}

export const DeadLetterQueFunction = new Lambda.Function({
  Description: "nomad-devops custom resource dead letter que handler",
  FunctionName: Fn.Join("", ["nomad-custom-resource-dead-letter-que-function", Fn.Ref("UUID")]),
  Role: Fn.GetAtt("DeadLetterQueFunctionRole", "Arn"),
  Runtime: "nodejs12.x",
  Code: {
    S3Bucket: Fn.Ref("S3Bucket"),
    S3Key: Fn.Ref("S3Key")
  },
  Handler: `${DLQ_FILENAME}.handler`,
  MemorySize: 128,
  Environment
}).dependsOn("DeadLetterQueFunctionRole");
