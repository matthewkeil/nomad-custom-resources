import { Debug } from "./utils";
const debug = Debug(__dirname, __filename);
import { CloudFormationCustomResourceHandler } from "aws-lambda";
import { CustomProvider } from "./CustomProvider";
// import { testProviders } from "./providers/testProviders";
import { recordSetProvider } from "./providers/RecordSetProvider";
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

const buildHandler = (resources: {
  [resource: string]: CustomProvider;
}): CloudFormationCustomResourceHandler => {
  type Resource = keyof typeof resources;
  const resourceTypes = new Set<Resource>(Object.keys(resources) as Resource[]);

  return async (event, context) => {
    const type = event.ResourceType.split("::").pop() as Resource;
    debug({ type, event, context });
    if (resourceTypes.has(type)) {
      const results = await resources[type].handle(event, context);
      return debug({ results });
    }

    const response = await CustomProvider.handleError({
      event,
      Reason: "NomadDevops doesn't have that kind of custom resource"
    });
    debug({ response });
  };
};

export const handler = buildHandler(resourceProviders);
export const dlqTest: CloudFormationCustomResourceHandler = async (event, context) => {
  console.log("dlqTest handler: ", { event, context });
  throw new Error("dlq test error. it works!! me thinks...");
};
