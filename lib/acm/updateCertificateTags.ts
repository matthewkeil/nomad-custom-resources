import { Debug } from "../../src/utils";
const debug = Debug(__dirname, __filename);
import { ACM } from "aws-sdk";
import { acm } from "../../config";

export const updateCertificateTags = async ({
  CertificateArn,
  Tags
}: {
  CertificateArn: string;
  Tags: ACM.TagList;
}) => {
  const { Tags: old = [] } = await acm.listTagsForCertificate({ CertificateArn }).promise();
  const oldTags = new Map(old.map(({ Key, Value }) => [Key, Value]));
  debug("oldTags: ", oldTags);
  const newTags = new Map(Tags.map(({ Key, Value }) => [Key, Value]));
  debug("newTags: ", newTags);
  const adds: ACM.TagList = [];
  const deletes: ACM.TagList = [];
  for (const [Key, newValue] of newTags) {
    if (!oldTags.has(Key)) {
      adds.push({ Key, Value: newValue });
      continue;
    }
    const oldValue = oldTags.get(Key);
    if (newValue !== oldValue) {
      adds.push({ Key, Value: newValue });
      deletes.push({ Key, Value: oldValue });
    }
  }
  for (const [Key, oldValue] of oldTags) {
    if (!newTags.has(Key)) {
      deletes.push({ Key, Value: oldValue });
      continue;
    }
  }
  debug("adds: ", adds);
  debug("deletes: ", deletes);
  const delPromise = deletes.length
    ? acm.removeTagsFromCertificate({ CertificateArn, Tags: deletes }).promise()
    : Promise.resolve({});
  const addPromise = adds.length
    ? acm.addTagsToCertificate({ CertificateArn, Tags: adds }).promise()
    : Promise.resolve({});
  return await Promise.all([addPromise, delPromise]);
};
