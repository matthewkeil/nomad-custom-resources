import { Debug } from "./debug";
const debug = Debug(__dirname, __filename);
import {
  CloudFormationCustomResourceHandler,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceUpdateEvent,
  CloudFormationCustomResourceEvent
} from "aws-lambda";
import axios from "axios";
import { generate } from "shortid";


const resourceProviders = {
  RecordSet: "recordSetProvider",
  HostedZone: "hostedZoneProvider",
  Certificate: "certificateProvider",
  CertificateRequest: "certificateRequestProvider"
};
type ResourceType = keyof typeof resourceProviders;
const resourceTypes = new Set<ResourceType>(
  Object.keys(resourceProviders) as (keyof typeof resourceProviders)[]
);

export const handler: CloudFormationCustomResourceHandler = async (event, context) => {
  try {
    const type = event.ResourceType.split("::").pop() as ResourceType;
    debug({ event, context, type });
    if (!resourceTypes.has(type)) {
      await sendResponse({
        event,
        response: {
          Status: "FAILED",
          Reason: "NomadDevops doesn't have that kind of custom resource"
        }
      });
      return;
    }

    // const response = await resourceProviders[type](event, context);
    const res = await sendResponse({
      event,
      response: {
        Status: "SUCCESS"
      }
    });
    console.log("PUT response: ", res);
  } catch (err) {
    const res = await sendResponse({
      event,
      response: { Status: "FAILED", Reason: JSON.stringify(err) }
    });
    console.log("caught error - PUT response: ", res);
  }
};
