import { Debug } from "./utils";
const debug = Debug(__dirname, __filename);
import { sep } from "path";
import { unlink, writeFile } from "fs/promises";
import { generate as Generate } from "shortid";
const generate = () => Generate().replace(/[-_]/g, `${Math.floor(Math.random() * 10)}`);
import JSZip from "jszip";
import { deploy } from "../bin/deploy";
import {
  BUILD_FOLDER,
  FILENAME,
  BUCKET_NAME,
  BUCKET_PREFIX,
  BUNDLE_PATH,
  s3,
  cloudformation,
  logs
} from "../config";
import {
  deleteTestStack,
  createTestStack,
  createDlqTestStack,
  createDlqTriggerStack,
  deleteDlqTestStack,
  deleteDlqTriggerStack
} from "../test/utils";

const Bucket = BUCKET_NAME;
let uuid!: string;
let zipKey!: string;
let zipPath!: string;
let templateKey!: string;
let templatePath!: string;
const tempS3: string[] = [];
const tempFiles: string[] = [];
const RUN_PREFIX = generate();
debug({ RUN_PREFIX });

jest.setTimeout(240000);
beforeAll(done => {
  deploy().then(response => {
    ({ uuid, zipKey, zipPath, templatePath, templateKey } = response);
    tempS3.push(zipKey, templateKey);
    tempFiles.push(zipPath, templatePath);
    done();
  });
});

it("build/deploy should be setup correctly", async done => {
  expect.assertions(11);
  expect(Bucket).toEqual(BUCKET_NAME);
  expect(zipKey.startsWith(BUCKET_PREFIX)).toBeTruthy();
  expect(!!uuid).toBeTruthy();

  const { ContentType, Body } = await s3.getObject({ Bucket, Key: zipKey }).promise();
  const zip = await JSZip.loadAsync(Body);
  expect(ContentType).toEqual("application/octet-stream");

  const testBundle = BUILD_FOLDER + sep + `${uuid}.zip`;
  await writeFile(testBundle, await zip.file(FILENAME + ".js").async("nodebuffer"));
  tempFiles.push(testBundle);

  const testTemplate = BUILD_FOLDER + sep + `${uuid}.json`;
  await writeFile(testTemplate, await zip.file("cloudformation.json").async("nodebuffer"));
  tempFiles.push(testTemplate);

  let bundle: any;
  expect(() => (bundle = require(testBundle))).not.toThrow();
  expect(typeof bundle.handler).toEqual("function");
  expect(bundle.handler.length).toEqual(2);
  expect(typeof bundle.dlqTest).toEqual("function");
  expect(bundle.dlqTest.length).toEqual(0);

  let template: any;
  expect(() => (template = require(testTemplate))).not.toThrow();
  expect(template.AWSTemplateFormatVersion).toEqual("2010-09-09");
  done();
});

it("should deploy", async () => {
  expect.assertions(2);
  const testId = "should-deploy";
  let results = await createTestStack({ uuid, testId });
  expect(results?.StackStatus).toEqual("CREATE_COMPLETE");
  results = await deleteTestStack({ uuid, testId });
  expect(results?.StackStatus).toEqual("DELETE_COMPLETE");
});

it("should fall back to dead letter que", async done => {
  expect.assertions(2);
  const dlqStack = await createDlqTestStack(uuid);
  const { StackResources = [] } = await cloudformation
    .describeStackResources({ StackName: dlqStack?.StackName })
    .promise();

  const startTime = Date.now();
  const logGroups = new Map<"provider" | "dlq", () => Promise<string[]>>();
  for (const resource of StackResources) {
    if (resource.ResourceType === "AWS::Logs::LogGroup") {
      debug(resource);
      const listEntries = async () => {
        const entries = [] as AWS.CloudWatchLogs.FilteredLogEvents;
        let marker: undefined | string;
        do {
          const { events, nextToken } = await logs
            .filterLogEvents({
              logGroupName: `${resource.PhysicalResourceId}`,
              startTime,
              nextToken: marker
            })
            .promise();
          if (events) entries.push(...events);
          if (nextToken) marker = nextToken;
        } while (marker);
        return entries;
      };

      const getEvents = (provider: boolean) => async () => {
        const entries = await listEntries();
        const IS_PROVIDER_EVENT = /RequestType: '((?:Create)|(?:Update)|(?:Delete))'/;
        const IS_DLQ_EVENT = /\"RequestType\":\"((?:Create)|(?:Update)|(?:Delete))\"/;
        const TEST = provider ? IS_PROVIDER_EVENT : IS_DLQ_EVENT;
        const events = entries
          .filter(log => TEST.test(log.message || ""))
          .map(log => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return TEST.exec(log.message || "")![1];
          });
        return events;
      };

      if (resource.LogicalResourceId.includes("CustomResourceProvider"))
        logGroups.set("provider", getEvents(true));
      if (resource.LogicalResourceId.includes("DeadLetterQue"))
        logGroups.set("dlq", getEvents(false));
    }
  }

  let history = {
    provider: [] as string[],
    dlq: [] as string[]
  };
  const getLogs = async () => {
    const current = {} as typeof history;
    for (const [group, getter] of logGroups) {
      current[group] = await getter();
    }
    return current;
  };

  const logPoll = setInterval(async () => {
    const current = await getLogs();
    if (
      current.provider.length !== history.provider.length ||
      current.dlq.length !== history.dlq.length
    ) {
      debug(current);
    }
    history = current;
    if (history.provider.length > 2) {
      setTimeout(() => {
        debug("timeout for dlq expect set");
        expect(history.dlq[0]).toEqual(history.provider[0]);
      }, 2000);
    }
  }, 1000);

  const triggerStackName = `custom-resources-test-${uuid}-dlq-trigger`;
  await createDlqTriggerStack(uuid);
  await cloudformation.waitFor("stackCreateComplete", { StackName: triggerStackName }).promise();
  clearInterval(logPoll);

  const { StackEvents } = await cloudformation
    .describeStackEvents({ StackName: triggerStackName })
    .promise();
  const dlqEvent = StackEvents?.find(event =>
    event.ResourceStatusReason?.includes("Dead letter que response")
  );
  expect(dlqEvent).not.toBeUndefined();
  await Promise.all([deleteDlqTestStack(uuid), deleteDlqTriggerStack(uuid)]);
  done();
});

afterAll(async done => {
  debug({ outFile: zipPath, templatePath, BUNDLE_PATH, Key: zipKey });
  const tempDeletePromises: Promise<any>[] = tempFiles.map(unlink);
  const s3DeletePromises: Promise<any>[] = tempS3.map(Key =>
    s3.deleteObject({ Bucket, Key }).promise()
  );
  await Promise.all([...s3DeletePromises, ...tempDeletePromises]);
  done();
});
