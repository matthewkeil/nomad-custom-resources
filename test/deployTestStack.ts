import CF from "cloudform";
import { handleStack } from "nomad-devops";
import { buildTestStackTemplate } from "../templates/buildStackTemplate";
import { config } from "../config";

const Bucket = "nomad-devops";
const Prefix = "testing/resources/custom";

export const deleteTestStack = async () => {};

export const deployTestStack = async () => {
  const { Contents = [] } = await config.s3.listObjects({ Bucket, Prefix }).promise();
  for (const obj of Contents) {
    config.s3
      .deleteObject({
        Bucket,
        Key: `${obj.Key}`
      })
      .promise();
  }
  if (!Key) throw new Error("could not locate custom resources");
  return await handleStack({
    StackName: "custom-resources-test-stack",
    Capabilities: ["CAPABILITY_NAMED_IAM"],
    TimeoutInMinutes: 13,
    TemplateBody: CF(
      await buildTestStackTemplate({
        Bucket,
        Key
      })
    )
  });
};
