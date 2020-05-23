import { Debug } from "./utils";
const debug = Debug(__dirname, __filename);
import { CloudFormationCustomResourceHandler } from "aws-lambda";
import { CustomProvider } from "./CustomProvider";
import { recordSetProvider } from "./RecordSetProvider";
// import { hostedZoneProvider } from "./hostedZoneProvider";
// import { certificateProvider } from "./certificateProvider";
// import { certificateRequestProvider } from "./certificateRequestProvider";

const resourceProviders = {
  RecordSet: recordSetProvider
  // HostedZone: hostedZoneProvider,
  // Certificate: certificateProvider,
  // CertificateRequest: certificateRequestProvider
} as const;
export type CustomResource = keyof typeof resourceProviders;

export const buildHandler = (resources: {
  [resource: string]: CustomProvider;
}): CloudFormationCustomResourceHandler => {
  type Resource = keyof typeof resources;

  const resourceTypes = new Set<Resource>(Object.keys(resources) as Resource[]);

  return async (event, context) => {
    debug({ event, context });
    const type = event.ResourceType.split("::").pop() as Resource;
    if (!resourceTypes.has(type)) {
      await CustomProvider.sendResults(event, {
        Status: "FAILED",
        Reason: "NomadDevops doesn't have that kind of custom resource"
      });
      return;
    }

    await resources[type].handle(event);
  };
};

export const handler = buildHandler(resourceProviders);
