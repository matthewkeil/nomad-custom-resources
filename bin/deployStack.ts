import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { generate } from "shortid";
import CF from "cloudform";
import { handleStack, createStack, deleteStack } from "nomad-devops";
import { s3, BUCKET_NAME, LAMBDA_TIMEOUT, BUCKET_PREFIX, getTemplateKey } from "../config";
import Axios from "axios";
import { buildTemplate } from "../templates/buildTemplate";

export const deleteTestStack = async () => {};

export const deployStack = async (
  runPrefix: string = generate(),
  testNum: string | number = generate()
) => {
  const StackName = `custom-resources-test-${runPrefix}-${testNum}`;
  debug({ StackName });
  return await createStack({
    StackName,
    TimeoutInMinutes: LAMBDA_TIMEOUT,
    TemplateURL: `https://${BUCKET_NAME}.s3.amazonaws.com/${getTemplateKey()}`,
    Capabilities: ["CAPABILITY_NAMED_IAM"]
  });
};

if (require.main === module) {
  deployStack()
    .then(console.log)
    .catch(console.error);
}
