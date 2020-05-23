import { Debug } from "../../src/utils";
const debug = Debug(__dirname, __filename);
import { Route53 } from "aws-sdk";
import { v4 } from "uuid";
import { config } from "../../config";
import { HostedZoneParams } from "./HostedZoneParams";
import { getDelegationSet } from "./getDelegationSet";
import { getFullHostedZoneInfo } from "./getFullHostedZoneInfo";

interface CreateHostedZoneParams {
  RequestId: string;
  ResourceProperties: Partial<HostedZoneParams>;
}

export const createHostedZone = async ({
  RequestId = v4(),
  ResourceProperties,
}: CreateHostedZoneParams): Promise<HostedZoneParams> => {
  const {
    Name,
    HostedZoneConfig = {},
    HostedZoneTags,
    QueryLoggingConfig,
    VPCs,
  } = ResourceProperties;
  HostedZoneConfig.PrivateZone = false;
  if (!HostedZoneConfig.Comment)
    HostedZoneConfig.Comment = "brought to you by https://devops.nomad.house";

  const deletgationSet = await getDelegationSet("");
  const params = {
    CallerReference: RequestId,
    Name,
    DelegationSetId: deletgationSet.Id,
    HostedZoneConfig,
  } as Route53.CreateHostedZoneRequest;
  if (VPCs) params.VPC = VPCs[0];
  const { HostedZone } = await config.route53.createHostedZone(params).promise();
  const Id = `${HostedZone.Id.split("/").pop()}`;

  if (VPCs && VPCs.length > 1) {
    for (const vpc of VPCs.slice(1)) {
      await config.route53.associateVPCWithHostedZone({ HostedZoneId: Id, VPC: vpc }).promise();
    }
  }

  if (HostedZoneTags?.length) {
    await config.route53
      .changeTagsForResource({
        ResourceId: Id,
        ResourceType: "hostedzone",
        AddTags: HostedZoneTags,
      })
      .promise();
  }

  if ((QueryLoggingConfig as Route53.QueryLoggingConfig)?.CloudWatchLogsLogGroupArn) {
    await config.route53
      .createQueryLoggingConfig({
        HostedZoneId: Id,
        CloudWatchLogsLogGroupArn: `${QueryLoggingConfig?.CloudWatchLogsLogGroupArn}`,
      })
      .promise();
  }

  return await getFullHostedZoneInfo({ Id });
};
