import Axios from "axios";
import { generate } from "shortid";
import { s3, BUCKET_NAME } from "../config";
import { send, CustomProvider } from "../src/CustomProvider";
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceUpdateEvent
} from "aws-lambda";

const RUN_PREFIX = generate();
console.log({ RUN_PREFIX });

const getKey = ({ Key }: { Key: string }) => `testing/${RUN_PREFIX}/${Key}`;

const getUrl = ({ Key }: { Key: string }) =>
  s3.getSignedUrlPromise("putObject", { Bucket: BUCKET_NAME, Key: getKey({ Key }) });

const getResponse = async ({ Key }: { Key: string }) => {
  const { Body = Buffer.from("{}") } = await s3
    .getObject({ Bucket: BUCKET_NAME, Key: getKey({ Key }) })
    .promise();
  return JSON.parse(Body.toString()) as CloudFormationCustomResourceResponse;
};

const deleteObject = async ({ Key }: { Key: string }) => {
  try {
    return s3
      .deleteObject({
        Bucket: BUCKET_NAME,
        Key: getKey({ Key })
      })
      .promise();
  } catch {}
};

const generateEvent = async (
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

it("test bucket should be setup correctly", async () => {
  expect.assertions(2);
  /**
   *
   * Make sure test bucket is setup correctly
   *
   */
  const Key = "testObject";
  const tryPut = (url = `https://${BUCKET_NAME}.s3.amazonaws.com/${getKey({ Key })}`) =>
    Axios({
      url,
      method: "PUT",
      headers: {
        "Content-Type": ""
      },
      data: ""
    });

  // verify test object is not present
  await deleteObject({ Key });

  try {
    await tryPut();
  } catch (err) {
    expect(err.response.status).toEqual(403);
  }

  const url = await getUrl({ Key });
  const response = await tryPut(url);
  expect(response.status).toEqual(200);

  await deleteObject({ Key });
});

it("send() should PUT to presigned url", async done => {
  expect.assertions(1);
  const Key = "testSend";
  const url = await getUrl({ Key });
  const response = await send({ url, data: "" });
  expect(response).toEqual(200);
  await deleteObject({ Key });
  done();
});

describe("CustomResource.prepareResponse", () => {
  it("should handle FAILED responses", async () => {
    const event = await generateEvent("Update");
    const results: any = {
      Status: "FAILED",
      Reason: "testing",
      Data: { again: "dont be there, please..." },
      NoEcho: true
    };
    const { RequestId, LogicalResourceId, StackId, PhysicalResourceId } = event;
    const _event = { RequestId, LogicalResourceId, StackId, PhysicalResourceId };
    const _response = { ..._event, Status: results.Status, Reason: results.Reason };
    const response = CustomProvider.prepareResponse(event, results);
    expect(response).toEqual(_response);
    expect(Object.keys(response).length).toEqual(Object.keys(_response).length);
  });
  it("should properly format Delete SUCCESS responses", async () => {
    const event = await generateEvent("Delete");
    const results: any = {
      Status: "SUCCESS",
      Reason: "better not show up yo!",
      Data: { again: "dont be there, please..." },
      NoEcho: true
    };
    const { RequestId, LogicalResourceId, StackId, PhysicalResourceId } = event;
    const _event = { RequestId, LogicalResourceId, StackId, PhysicalResourceId };
    const _response = { ..._event, Status: results.Status };
    const response = CustomProvider.prepareResponse(event, results);
    expect(response).toEqual(_response);
    expect(Object.keys(response).length).toEqual(Object.keys(_response).length);
  });
  it("should properly format Create/Update SUCCESS responses", async () => {
    const event = await generateEvent("Update");
    const { RequestId, LogicalResourceId, StackId, PhysicalResourceId } = event;
    const _event = { RequestId, LogicalResourceId, StackId, PhysicalResourceId };
    const results: any = {
      Status: "SUCCESS",
      Data: { test: "data" },
      NoEcho: true,
      Reason: "better not show up yo!"
    };
    const _response = {
      ..._event,
      Status: results.Status,
      Data: results.Data,
      NoEcho: results.NoEcho
    };
    const response = CustomProvider.prepareResponse(event, results);
    expect(response).toEqual(_response);
    expect(Object.keys(response).length).toEqual(Object.keys(_response).length);
  });
  it("should create PhysicalResourceId if missing", async () => {
    let event: any = await generateEvent("Create");
    expect(event.PhysicalResourceId).toBeUndefined();
    let response = CustomProvider.prepareResponse(event, { Status: "SUCCESS" });
    expect(response.PhysicalResourceId).not.toBeUndefined();

    event = await generateEvent("Update");
    expect(event.PhysicalResourceId).not.toBeUndefined();
    response = CustomProvider.prepareResponse(event, { Status: "SUCCESS" });
    expect(response.PhysicalResourceId).toEqual(event.PhysicalResourceId);
  });
});

describe("CustomResource", () => {
  describe("new CustomResource()", () => {
    it("should not throw with bad handlers", () => {
      expect(
        new CustomProvider({
          create: undefined as any,
          update: undefined as any,
          delete: undefined as any
        })
      ).toBeInstanceOf(CustomProvider);
      expect(
        new CustomProvider({
          create: ((a: any, b: any) => ({})) as any,
          update: ((a: any, b: any) => ({})) as any,
          delete: ((a: any, b: any) => ({})) as any
        })
      ).toBeInstanceOf(CustomProvider);
    });
    it("should add a default 'bad handler' that fail gracefully if invalid handlers are passed", async () => {
      const provider = new CustomProvider({} as any);

      let event = await generateEvent("Create");
      let Key = event.RequestId;
      await provider.handle(event);
      let response = await getResponse({ Key });
      expect(response.Reason).toEqual("create handler is not implemented");
      expect(response.Status).toEqual("FAILED");
      await deleteObject({ Key });

      event = await generateEvent("Update");
      Key = event.RequestId;
      await provider.handle(event);
      response = await getResponse({ Key });
      expect(response.Reason).toEqual("update handler is not implemented");
      expect(response.Status).toEqual("FAILED");
      await deleteObject({ Key });

      event = await generateEvent("Delete");
      Key = event.RequestId;
      await provider.handle(event);
      response = await getResponse({ Key });
      expect(response.Reason).toEqual("delete handler is not implemented");
      expect(response.Status).toEqual("FAILED");
      await deleteObject({ Key });
    });
  });
  it("should throw for invalid RequestType", async () => {
    const provider = new CustomProvider({
      create: undefined as any,
      update: undefined as any,
      delete: undefined as any
    });
    const event = await generateEvent("Update");
    const Key = event.RequestId;
    event.RequestType = "NOTVALID" as any;
    await provider.handle(event);
    const response = await getResponse({ Key });
    expect(response.Reason).toEqual("invalid event.RequestType");
    await deleteObject({ Key });
  });
  it("should safely deal with handlers that throw", async () => {
    const message = "errored good, yo'";
    const errorHandler = async () => {
      throw new Error(message);
    };
    const errorProvider = new CustomProvider({
      create: errorHandler,
      update: errorHandler,
      delete: errorHandler
    });
    const event = await generateEvent("Update");
    const Key = event.RequestId;
    await errorProvider.handle(event);
    const response = await getResponse({ Key });
    expect(response.Reason).toEqual(message);
    await deleteObject({ Key });
  });
});
