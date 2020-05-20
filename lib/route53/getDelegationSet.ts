import { Debug } from "../../src/debug";
const debug = Debug(__dirname, __filename);
import { Route53 } from "aws-sdk";
import { config } from "../../config";
import { getHostedZoneForDomain } from "./getHostedZoneForDomain";

const CALLER_REFERENCE = "nomad-devops-delegation-set";

export const getDelegationSet = async (domain: string): Promise<Route53.DelegationSet> => {
  const existing = [] as Route53.DelegationSet[];
  let Marker: undefined | string;
  do {
    const { DelegationSets, NextMarker } = await config.route53
      .listReusableDelegationSets({ Marker })
      .promise();
    debug("NextMarker: ", NextMarker);
    existing.push(...(DelegationSets?.length ? DelegationSets : []));
    Marker = NextMarker;
  } while (!!Marker);

  debug("existing DelegationSets: ", existing);
  const delegationSet = existing.find(set => set.CallerReference === CALLER_REFERENCE);
  debug("DelegationSet: ", delegationSet);
  if (delegationSet) return delegationSet;

  const request: Route53.CreateReusableDelegationSetRequest = {
    CallerReference: CALLER_REFERENCE
  };
  const hostedZoneId = await getHostedZoneForDomain(domain);
  if (hostedZoneId?.Id) request.HostedZoneId = hostedZoneId.Id.split("/").pop();
  debug("CreateDelegationSetRequest: ", request);

  const { DelegationSet } = await config.route53.createReusableDelegationSet(request).promise();
  return DelegationSet;
};
