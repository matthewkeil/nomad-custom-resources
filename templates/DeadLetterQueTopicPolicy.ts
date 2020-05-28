import { SNS, Fn, Refs } from "cloudform";

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
          AWS: "*"
        },
        Condition: {
          ArnLike: {
            "AWS:SourceArn": Fn.Join(":", ["arn:aws:*:*", Refs.AccountId])
          }
        }
      }
    ]
  }
}).dependsOn("DeadLetterQueTopic");
