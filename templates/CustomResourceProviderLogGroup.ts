import { Logs, Fn } from "cloudform";

export const CustomResourceProviderLogGroup = new Logs.LogGroup({
  LogGroupName: Fn.Join("", ["/aws/lambda/nomad-custom-resource-provider", Fn.Ref("UUID")]),
  RetentionInDays: 7
});
