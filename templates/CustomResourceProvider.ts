import { Lambda, Fn } from "cloudform";
import { BRANCH, FILENAME, TEST } from "../config";

const Variables: NonNullable<NonNullable<
  Lambda.Function["Properties"]["Environment"]
>["Variables"]> = {
  BRANCH
};

if (typeof process.env.DEBUG === "string" && process.env.DEBUG.length) {
  Variables.DEBUG = process.env.DEBUG;
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
  Handler: Fn.Join(".", [FILENAME, Fn.Ref("LambdaHandler")]),
  MemorySize: 128,
  DeadLetterConfig: {
    TargetArn: Fn.Ref("DeadLetterQueTopic")
  },
  Environment: { Variables }
}).dependsOn("CustomResourceProviderRole");
