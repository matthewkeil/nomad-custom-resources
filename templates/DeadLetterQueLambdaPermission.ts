import { Lambda, Fn } from "cloudform";

export const DeadLetterQueLambdaPermission = new Lambda.Permission({
  FunctionName: Fn.Ref("DeadLetterQueFunction"),
  Principal: "sns.amazonaws.com",
  Action: "lambda:InvokeFunction"
}).dependsOn("DeadLetterQueFunction");
