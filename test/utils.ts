import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { generate } from "shortid";
import { s3, BUCKET_NAME } from "../config";
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceUpdateEvent
} from "aws-lambda";

export const RUN_PREFIX = generate();
debug({ RUN_PREFIX });

export const getUrl = ({ Key }: { Key: string }) =>
  s3.getSignedUrlPromise("putObject", { Bucket: BUCKET_NAME, Key: Key });

export const getResponse = async ({ Key }: { Key: string }) => {
  const { Body = Buffer.from("{}") } = await s3.getObject({ Bucket: BUCKET_NAME, Key }).promise();
  return JSON.parse(Body.toString()) as CloudFormationCustomResourceResponse;
};

export const deleteObject = ({ Key }: { Key: string }) => {
  try {
    return s3
      .deleteObject({
        Bucket: BUCKET_NAME,
        Key
      })
      .promise();
  } catch {}
};

export const generateEvent = async (
  type?: CloudFormationCustomResourceEvent["RequestType"]
): Promise<CloudFormationCustomResourceUpdateEvent> => {
  const RequestId = generate();
  const ResourceType = "Testing";
  const LogicalResourceId = `Custom::${ResourceType}`;
  const baseRequest = {
    RequestId,
    ResourceType,
    LogicalResourceId,
    ServiceToken: "testing",
    StackId: "testing-testing-testing-yo",
    ResponseURL: await getUrl({ Key: RequestId }),
    ResourceProperties: {
      ServiceToken: "testing"
    }
  };
  switch (type) {
    case "Delete":
      return {
        ...baseRequest,
        PhysicalResourceId: `${LogicalResourceId}-${RequestId}`,
        RequestType: "Delete"
      } as any;
    case "Update":
      return {
        ...baseRequest,
        PhysicalResourceId: `${LogicalResourceId}-${RequestId}`,
        OldResourceProperties: {},
        RequestType: "Update"
      } as any;
    default:
      return {
        ...baseRequest,
        RequestType: "Create"
      } as any;
  }
};
