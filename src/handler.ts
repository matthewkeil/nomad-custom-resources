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
};
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
      const response = await CustomProvider.handleError({
        event,
        Reason: "NomadDevops doesn't have that kind of custom resource"
      });
      debug({ response });
      return;
    }
    await resources[type].handle(event);
  };
};

export const handler = buildHandler(resourceProviders);
