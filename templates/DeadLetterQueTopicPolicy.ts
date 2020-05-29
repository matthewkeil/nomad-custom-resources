import { SNS, Fn } from "cloudform";

export const DeadLetterQueTopicPolicy = new SNS.TopicPolicy({
  Topics: [Fn.Ref("DeadLetterQueTopic")],
  PolicyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "sns:Publish",
        Resource: Fn.Ref("DeadLetterQueTopic"),
        Principal: {
          AWS: Fn.GetAtt("CustomResourceProviderRole", "Arn")
        }
      }
    ]
  }
}).dependsOn(["DeadLetterQueTopic", "CustomResourceProviderRole"]);
