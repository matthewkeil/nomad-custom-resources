import { Logs, Fn } from "cloudform";

export const DeadLetterQueLogGroup = new Logs.LogGroup({
  LogGroupName: Fn.Join("", ["/nomad-devops/custom-resource-dead-letter-que", Fn.Ref("UUID")]),
  RetentionInDays: 30
});
