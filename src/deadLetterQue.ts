import { Debug } from "./utils";
const debug = Debug(__dirname, __filename);
import { CloudFormationCustomResourceEvent } from "aws-lambda";
import { SNSHandler } from "aws-lambda";
import { CustomProvider, send } from "./CustomProvider";

export const handler: SNSHandler = async ({ Records }, context) => {
  debug({ Records, context });
  for (const record of Records) {
    const { Message, MessageAttributes } = record.Sns;
    console.log({ MessageAttributes, Message });
    const event = JSON.parse(Message) as CloudFormationCustomResourceEvent;
    const response = CustomProvider.prepareResponse(event, {
      Status: "FAILED",
      Reason:
        "Dead letter que response. Custom::Resource ServiceToken (lambda) has failed to respond. Default error, triggered one second before lambda timeout, did not activate if this error appears. Handler is likely in an infinite loop."
    });
    debug({ event, response });
    const results = await send({ url: event.ResponseURL, data: JSON.stringify(response) });
    console.log({ results });
  }
};
