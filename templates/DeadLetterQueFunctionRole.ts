import { IAM, Fn } from "cloudform";

export const DeadLetterQueFunctionRole = new IAM.Role({
  RoleName: Fn.Join("", ["nomad-custom-resource-dead-letter-que-function-role", Fn.Ref("UUID")]),
  AssumeRolePolicyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "sts:AssumeRole",
        Principal: {
          Service: "lambda.amazonaws.com"
        }
      }
    ]
  },
  Policies: [
    {
      PolicyName: Fn.Join("", [
        "nomad-custom-resource-dead-letter-que-function-policy",
        Fn.Ref("UUID")
      ]),
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: "logs:*",
            Resource: "*"
          }
        ]
      }
    }
  ]
});
