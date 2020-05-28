import { SNS, Fn } from "cloudform";

export const DeadLetterQueTopic = new SNS.Topic({
  TopicName: Fn.Join("", ["nomad-custom-resources-dead-letter-que-topic", Fn.Ref("UUID")]),
  DisplayName: Fn.Join("", ["nomad-custom-resources-dead-letter-que-topic", Fn.Ref("UUID")]),
  Subscription: [
    {
      Protocol: "lambda",
      Endpoint: Fn.GetAtt("DeadLetterQueFunction", "Arn")
    }
  ]
}).dependsOn("DeadLetterQueFunction");
