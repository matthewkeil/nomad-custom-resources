import { Debug } from "../../src/debug";
const debug = Debug(__dirname, __filename);
import { Route53, ACM } from "aws-sdk";
import { config } from "../../config";

interface DeleteHostedZoneParams {
  Id: string;
}

export const deleteHostedZone = async ({ Id }: DeleteHostedZoneParams): Promise<void> => {
  const { VPCs = [] } = await config.route53.getHostedZone({ Id }).promise();
  for (const vpc of VPCs) {
    debug("deleting vpc association: ", vpc);
    await config.route53.disassociateVPCFromHostedZone({ HostedZoneId: Id, VPC: vpc }).promise();
  }

  let tags: undefined | Route53.TagList;
  try {
    const { ResourceTagSet } = await config.route53
      .listTagsForResource({ ResourceType: "hostedzone", ResourceId: Id })
      .promise();
    tags = ResourceTagSet?.Tags || [];
  } catch {}
  if (tags?.length) {
    debug("deleting tags: ", tags);
    await config.route53
      .changeTagsForResource({
        ResourceType: "hostedzone",
        ResourceId: Id,
        RemoveTagKeys: tags.map(tag => `${tag?.Key}`)
      })
      .promise();
  }

  let queryLoggingConfig: undefined | Route53.QueryLoggingConfig;
  try {
    const { QueryLoggingConfig } = await config.route53.getQueryLoggingConfig({ Id }).promise();
    queryLoggingConfig = QueryLoggingConfig;
  } catch {}
  if (queryLoggingConfig?.CloudWatchLogsLogGroupArn) {
    debug("deleting queryLoggingConfig: ", queryLoggingConfig);
    await config.route53
      .deleteQueryLoggingConfig({
        Id
      })
      .promise();
  }

  let Marker: undefined | string;
  const records = [] as Route53.ResourceRecordSets;
  do {
    const { ResourceRecordSets = [], NextRecordIdentifier } = await config.route53
      .listResourceRecordSets({
        HostedZoneId: Id,
        StartRecordIdentifier: Marker
      })
      .promise();
    records.push(...ResourceRecordSets);
    Marker = NextRecordIdentifier;
  } while (!!Marker);

  const changes = [] as Route53.Changes;
  for (const record of records) {
    if (record.Type === "SOA" || record.Type === "NS") continue;
    changes.push({
      Action: "DELETE",
      ResourceRecordSet: record
    });
  }

  if (changes.length) {
    await config.route53
      .changeResourceRecordSets({
        HostedZoneId: Id,
        ChangeBatch: {
          Changes: changes
        }
      })
      .promise();
  }

  await config.route53.deleteHostedZone({ Id }).promise();
};
