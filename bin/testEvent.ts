import { generateEvent } from "../test/utils";

generateEvent("Create").then(event => {
  const snsEvent = {
    Records: [
      {
        EventVersion: "string",
        EventSubscriptionArn: "string",
        EventSource: "string",
        Sns: {
          SignatureVersion: "string",
          Timestamp: "string",
          Signature: "string",
          SigningCertUrl: "string",
          MessageId: "string",
          Message: JSON.stringify(event),
          MessageAttributes: {
            ErrorMessage: {
              Type: "String",
              Value: "errored good, yo!"
            },
            RequestID: {
              Type: "String",
              Value: event.RequestId
            },
            ErrorCode: {
              Type: "Number",
              Value: 500
            }
          },
          Type: "string",
          UnsubscribeUrl: "string",
          TopicArn: "string",
          Subject: "string"
        }
      }
    ]
  };

  console.log(JSON.stringify(snsEvent));
});

const a = {
  "Records": [
    {
      "EventVersion": "string",
      "EventSubscriptionArn": "string",
      "EventSource": "string",
      "Sns": {
        "SignatureVersion": "string",
        "Timestamp": "string",
        "Signature": "string",
        "SigningCertUrl": "string",
        "MessageId": "string",
        "Message":
          '{"RequestId":"R4Y05dOtPi","ResourceType":"Testing","LogicalResourceId":"Custom::Testing","ServiceToken":"testing","StackId":"testing-testing-testing-yo","ResponseURL":"https://nomad-devops.s3.amazonaws.com/resources/dev/FX5G9DEeS/R4Y05dOtPi?AWSAccessKeyId=AKIASB26D2XOCLMNDUKM&Expires=1590722565&Signature=KeMCFd7mcVG3sXdu3TmDqROEAM8%3D","ResourceProperties":{"ServiceToken":"testing"},"RequestType":"Create"}',
        "MessageAttributes": {
          "ErrorMessage": { "Type": "String", "Value": "errored good, yo!" },
          "RequestID": { "Type": "String", "Value": "R4Y05dOtPi" },
          "ErrorCode": { "Type": "Number", "Value": 500 }
        },
        "Type": "string",
        "UnsubscribeUrl": "string",
        "TopicArn": "string",
        "Subject": "string"
      }
    }
  ]
};
