import { Debug } from "../../src/utils";
const debug = Debug(__dirname, __filename);
import { config } from "../../config";
import { normalizeDomain } from "../normalizeDomain";

export const getHostedZoneForDomain = async (domain: string) => {
  const hostedZone = await config.route53.listHostedZones().promise();

  return hostedZone.HostedZones.find(
    ({ Name }) =>
      normalizeDomain(Name).includes(normalizeDomain(domain)) ||
      normalizeDomain(domain).includes(normalizeDomain(Name))
  );
};
