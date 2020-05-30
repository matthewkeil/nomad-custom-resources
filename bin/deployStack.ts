import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { generate as Generate } from "shortid";
const generate = () => Generate().replace(/[-_]/g, `${Math.floor(Math.random() * 10)}`);
import {
  createTestStack,
  deleteTestStack,
  createDlqTriggerStack,
  createDlqTestStack,
  RUN_PREFIX
} from "../test/utils";
import { cloudformation, logs } from "../config";

const testDlq = async (uuid: string = RUN_PREFIX) => {
  const dlqStackName = `custom-resources-test-${uuid}-dlq-test`;
  let dlqStack;
  try {
    const { Stacks } = await cloudformation.describeStacks({ StackName: dlqStackName }).promise();
    dlqStack = Stacks?.find(stack => stack.StackName === dlqStackName);
  } catch (err) {
    if (err.message.includes(dlqStackName + " does not exist")) {
      debug("creating dlq test stack");
      dlqStack = await createDlqTestStack(uuid);
    } else throw err;
  }
  debug(dlqStack);

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

  console.log("polling for logs");
  const logPoll = setInterval(async () => {
    const current = await getLogs();
    let updated = false;
    if (
      current.provider.length !== history.provider.length ||
      current.dlq.length !== history.dlq.length
    ) {
      updated = true;
    }
    history = current;
    if (updated) console.log(history);
  }, 1000);

  // await createDlqTriggerStack(uuid);
};

if (require.main === module) {
  cloudformation
    .deleteStack({
      StackName: "custom-resources-test-dlq-trigger-u2HsM8u8g",
      RetainResources: ["DlqError"]
    })
    .promise()
    .then(console.log);

  // testDlq("u2HsM8u8g");
}
