import { Debug } from "../../src/utils";
const debug = Debug(__dirname, __filename);
import { Route53 } from "aws-sdk";
import { route53 } from "../../config";

export const getFullHostedZoneInfo = async ({ Id }: { Id: string }) => {
  const { HostedZone, VPCs } = await route53.getHostedZone({ Id }).promise();
  const Name = HostedZone.Name;
  const HostedZoneConfig = HostedZone.Config;

  let HostedZoneTags: undefined | Route53.TagList;
  try {
    const { ResourceTagSet } = await route53
      .listTagsForResource({ ResourceId: Id, ResourceType: "hostedzone" })
      .promise();
    HostedZoneTags = ResourceTagSet?.Tags;
  } catch {}

  let QueryLoggingConfig: undefined | Route53.QueryLoggingConfig;
  try {
    const queryConfig = await route53.getQueryLoggingConfig({ Id }).promise();
    QueryLoggingConfig = queryConfig.QueryLoggingConfig;
  } catch {}

  return {
    Name,
    HostedZoneConfig,
    HostedZoneTags,
    QueryLoggingConfig,
    VPCs
  };
};
