import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import CF from "cloudform";
import { handleStack } from "nomad-devops";
import { s3, BUCKET_NAME, LAMBDA_TIMEOUT, BUCKET_PREFIX, getTemplateKey } from "../config";
import Axios from "axios";
import { buildTemplate } from "../templates/buildTemplate";

export const deleteTestStack = async () => {};

export const deployTestStack = async (Key: string) => {
  // const tem = await Axios.get(getTemplateUrl(Key));
  // console.log(tem);
  // const template = s3.getObject({ Bucket: BUCKET_NAME, Key });
  const template = buildTemplate({ Key });
  // console.log(JSON.parse(template));
  return handleStack({
    StackName: "custom-resources-test-stack",
    TimeoutInMinutes: LAMBDA_TIMEOUT,
    TemplateURL: `https://${BUCKET_NAME}.s3.amazonaws.com/${getTemplateKey()}`,
    // TemplateBody: template,
    Capabilities: ["CAPABILITY_NAMED_IAM"]
  });
};

if (require.main === module) {
  deployTestStack("resources/dev/7nhFcW0qa")
    .then(console.log)
    .catch(console.error);
}
