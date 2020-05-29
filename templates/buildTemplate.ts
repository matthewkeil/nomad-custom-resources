import CF, { Fn } from "cloudform";
import { CustomResourceProvider } from "./CustomResourceProvider";
import { CustomResourceProviderLogGroup } from "./CustomResourceProviderLogGroup";
import { CustomResourceProviderRole } from "./CustomResourceProviderRole";
import { DeadLetterQueFunction } from "./DeadLetterQueFunction";
import { DeadLetterQueFunctionRole } from "./DeadLetterQueFunctionRole";
import { DeadLetterQueLogGroup } from "./DeadLetterQueLogGroup";
import { DeadLetterQueLambdaPermission } from "./DeadLetterQueLambdaPermission";
import { DeadLetterQueTopicPolicy } from "./DeadLetterQueTopicPolicy";
import { DeadLetterQueTopic } from "./DeadLetterQueTopic";
import { BUCKET_NAME, PROD, LAMBDA_TIMEOUT } from "../config";

export const buildTemplate = ({ Bucket = BUCKET_NAME, Key }: { Bucket?: string; Key: string }) => {
  const uuid = Key.split(".")
    .shift()
    ?.split("/")
    .pop();

  const template = {
    AWSTemplateFormatVersion: "2010-09-09",
    Description:
      "nomad-custom-resources the stack. coming soon, nomad-custom-resources the breakfast cereal",
    Parameters: {
      S3Bucket: {
        Type: "String",
        Default: Bucket
      },
      S3Key: {
        Type: "String",
        Default: Key
      },
      UUID: {
        Type: "String",
        Default: PROD ? "" : `-${uuid}`
      },
      LambdaHandler: {
        Type: "String",
        Default: "handler",
        AllowedValues: ["handler", "dlqTest"]
      },
      LambdaTimeout: {
        Type: "Number",
        Default: LAMBDA_TIMEOUT
      }
    },
    Resources: {
      CustomResourceProvider,
      CustomResourceProviderLogGroup,
      CustomResourceProviderRole,
      DeadLetterQueFunction,
      DeadLetterQueFunctionRole,
      DeadLetterQueLambdaPermission,
      DeadLetterQueLogGroup,
      DeadLetterQueTopicPolicy,
      DeadLetterQueTopic
    },
    Outputs: {
      CustomResourceProvider: {
        Description: "Your nomad-devops CustomResource provider",
        Value: Fn.GetAtt("CustomResourceProvider", "Arn"),
        Export: {
          Name: Fn.Join("", ["NomadDevopsCustomResourceProvider", Fn.Ref("UUID")])
        }
      }
    }
  };

  // minifiy template in production
  return PROD ? JSON.stringify(JSON.parse(CF(template))) : CF(template);
};
