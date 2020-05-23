import { Debug } from "../../src/utils";
const debug = Debug(__dirname, __filename);
import { route53 } from "../../config";
import { normalizeDomain } from "../normalizeDomain";

export const getHostedZoneForDomain = async (domain: string) => {
  const hostedZone = await route53.listHostedZones().promise();

  return hostedZone.HostedZones.find(
    ({ Name }) =>
      normalizeDomain(Name).includes(normalizeDomain(domain)) ||
      normalizeDomain(domain).includes(normalizeDomain(Name))
  );
};
