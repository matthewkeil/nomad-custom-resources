import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { generate as Generate } from "shortid";
const generate = () => Generate().replace(/[-_]/g, `${Math.floor(Math.random() * 10)}`);
import {
  createTestStack,
  deleteTestStack,
  createDlqTriggerStack,
  createDlqTestStack
} from "../test/utils";

if (require.main === module) {
  // createDlqTestStack();
  createDlqTriggerStack("cmIoTmv4A");
  // console.log(
  //   JSON.stringify({
  //     RequestType: 'Delete',
  //     ServiceToken: 'arn:aws:lambda:us-east-1:141394433500:function:nomad-custom-resource-provider-FHAFo2Spe',
  //     ResponseURL: 'https://cloudformation-custom-resource-response-useast1.s3.amazonaws.com/arn%3Aaws%3Acloudformation%3Aus-east-1%3A141394433500%3Astack/custom-resources-test-dlq-trigger-FHAFo2Spe/78741c80-a15c-11ea-ba6e-0ee829539650%7CDlqError%7Cd6987c22-1e73-498c-8787-473f31f1d80c?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20200529T033557Z&X-Amz-SignedHeaders=host&X-Amz-Expires=7200&X-Amz-Credential=AKIA6L7Q4OWT2CFW5GI6%2F20200529%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Signature=103f052dc9ad768627237044dd8a4bdd8c9074dd037efa376510ad771bb5c682',
  //     StackId: 'arn:aws:cloudformation:us-east-1:141394433500:stack/custom-resources-test-dlq-trigger-FHAFo2Spe/78741c80-a15c-11ea-ba6e-0ee829539650',
  //     RequestId: 'd6987c22-1e73-498c-8787-473f31f1d80c',
  //     LogicalResourceId: 'DlqError',
  //     PhysicalResourceId: 'NomadDevops-DlqError--F3fN-BW1',
  //     ResourceType: 'Custom::DlqError',
  //     ResourceProperties: {
  //       ServiceToken: 'arn:aws:lambda:us-east-1:141394433500:function:nomad-custom-resource-provider-FHAFo2Spe'
  //     }
  //   })
  // );
  // createTestStack("1234", "ohy108tzY").then(stack => {
  //   console.log(stack);
  //   // deleteTestStack("1234", "ohy108tzY")
  //   //   .then(console.log)
  //   //   .catch(console.error);
  // });
}
