import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { generate as Generate } from "shortid";
const generate = () => Generate().replace(/-_/g, `${Math.floor(Math.random() * 10)}`);
import { s3, BUCKET_NAME, LAMBDA_TIMEOUT, getTemplateKey, getKey, cloudformation } from "../config";
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
  type: CloudFormationCustomResourceEvent["RequestType"]
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
    ResponseURL: await getUrl({ Key: getKey(RUN_PREFIX, RequestId).Key }),
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

export const createTestStack = async (testId: string | number, runPrefix = RUN_PREFIX) => {
  const { StackId } = await cloudformation
    .createStack({
      StackName: `custom-resources-test-${runPrefix}-${testId}`,
      TimeoutInMinutes: LAMBDA_TIMEOUT,
      TemplateURL: `https://${BUCKET_NAME}.s3.amazonaws.com/${getTemplateKey()}`,
      Capabilities: ["CAPABILITY_NAMED_IAM"]
    })
    .promise();
  const StackName = StackId?.split("/")[1];
  const { Stacks } = await cloudformation.waitFor("stackCreateComplete", { StackName }).promise();
  return Stacks?.find(stack => stack.StackName === StackName);
};

export const deleteTestStack = async (testId: string | number, runPrefix = RUN_PREFIX) => {
  const StackName = `custom-resources-test-${runPrefix}-${testId}`;
  const { Stacks } = await cloudformation.describeStacks({ StackName }).promise();
  const currentStack = Stacks?.find(stack => stack.StackName === StackName);
  debug({ currentStack });
  await cloudformation.deleteStack({ StackName }).promise();
  await cloudformation.waitFor("stackDeleteComplete", { StackName }).promise();
  let Marker: undefined | string;
  do {
    const { StackSummaries, NextToken } = await cloudformation
      .listStacks({ StackStatusFilter: ["DELETE_COMPLETE"], NextToken: Marker })
      .promise();
    debug({ NextToken });
    const deleted = StackSummaries?.find(summary => summary.StackId === currentStack?.StackId);
    if (deleted) return deleted;
    if (NextToken) Marker = NextToken;
  } while (Marker);
};
