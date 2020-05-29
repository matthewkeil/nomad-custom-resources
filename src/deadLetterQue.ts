import { Debug } from "./utils";
const debug = Debug(__dirname, __filename);
import { CloudFormationCustomResourceEvent } from "aws-lambda";
import { SNSHandler } from "aws-lambda";
import { CustomProvider, send } from "./CustomProvider";
import { generateEvent } from "../test/utils";

export const handler: SNSHandler = async ({ Records }, context) => {
  debug({ Records, context });
  for (const record of Records) {
    const { Message, MessageAttributes } = record.Sns;
    console.log({ MessageAttributes, Message });
    const event = JSON.parse(Message) as CloudFormationCustomResourceEvent;
    const response = CustomProvider.prepareResponse(event, {
      Status: "FAILED",
      Reason:
        "custom resource provider has failed to respond. this response sent from dead letter que. handler is likely in an infinite loop and not triggering the default response error"
    });
    debug({ event, response });
    const results = await send({ url: event.ResponseURL, data: JSON.stringify(response) });
    console.log({ results });
  }
};
