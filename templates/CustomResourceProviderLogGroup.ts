import { Logs, Fn } from "cloudform";

export const CustomResourceProviderLogGroup = new Logs.LogGroup({
  LogGroupName: Fn.Join("/", [
    "/nomad-devops/custom-resource-provider",
    Fn.Ref("CustomResourceProvider")
  ]),
  RetentionInDays: 7
});
