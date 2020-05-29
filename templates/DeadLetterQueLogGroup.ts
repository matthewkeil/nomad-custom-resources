import { Logs, Fn } from "cloudform";

export const DeadLetterQueLogGroup = new Logs.LogGroup({
  LogGroupName: Fn.Join("", [
    "/aws/lambda/nomad-custom-resource-dead-letter-que-function",
    Fn.Ref("UUID")
  ]),
  RetentionInDays: 7
});
