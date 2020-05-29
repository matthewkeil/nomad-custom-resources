import { Logs, Fn } from "cloudform";

export const DeadLetterQueLogGroup = new Logs.LogGroup({
  LogGroupName: Fn.Join("/", ["/aws/lambda", Fn.Ref("DeadLetterQueFunction")]),
  RetentionInDays: 30
});
