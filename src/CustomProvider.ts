import { Debug } from "./utils";
const debug = Debug(__dirname, __filename);
import { parse } from "url";
import { request } from "https";
import { generate } from "shortid";
import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceUpdateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceFailedResponse,
  CloudFormationCustomResourceSuccessResponse
} from "aws-lambda";
import { PROD } from "../config";

interface FailedResponse {
  Status: "FAILED";
  Reason?: string;
  NoEcho?: boolean;
}
interface SuccessResponse {
  Status: "SUCCESS";
  NoEcho?: boolean;
  Data?: { [key: string]: string };
}
export type Results = SuccessResponse | FailedResponse;

export type CreateEventHandler = (
  event: CloudFormationCustomResourceCreateEvent
) => Promise<Results>;
export type UpdateEventHandler = (
  event: CloudFormationCustomResourceUpdateEvent
) => Promise<Results>;
export type DeleteEventHandler = (
  event: CloudFormationCustomResourceDeleteEvent
) => Promise<Results>;

export interface CustomProviderParams {
  create: CreateEventHandler;
  update: UpdateEventHandler;
  delete: DeleteEventHandler;
}

export function send({ url, data }: { url: string; data: string }) {
  return new Promise<number>((resolve, reject) => {
    const { host, path } = parse(url);
    debug({ url, host, path });

    const req = request(
      {
        method: "PUT",
        host,
        port: 443,
        path,
        headers: {
          "content-type": "",
          "content-length": data.length
        }
      },
      response => {
        debug("response: ", response);
        resolve(response.statusCode);
      }
    );
    debug("req: ", req);

    req.on("error", err => {
      debug(err);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

const defaultHandler = (type: keyof CustomProviderParams) => async (): Promise<Results> => ({
  Status: "FAILED",
  Reason: `${type} handler is not implemented`
});

export class CustomProvider {
  public static prepareResponse(
    event: CloudFormationCustomResourceEvent,
    results: Results
  ): CloudFormationCustomResourceResponse {
    const {
      RequestId,
      LogicalResourceId,
      StackId,
      PhysicalResourceId
    } = event as CloudFormationCustomResourceUpdateEvent;
    const response: Partial<CloudFormationCustomResourceResponse> = {
      RequestId,
      LogicalResourceId,
      StackId,
      Status: results.Status || "FAILED",
      PhysicalResourceId:
        PhysicalResourceId || `NomadDevops-${event.ResourceType.split("::").pop()}-${generate()}`
    };

    if (response.Status === "FAILED") {
      response.Reason = !!(results as FailedResponse).Reason?.length
        ? (results as FailedResponse).Reason
        : "unknown reason for failure";
      return response as CloudFormationCustomResourceFailedResponse;
    }

    if (event.RequestType !== "Delete" && results.hasOwnProperty("NoEcho"))
      response.NoEcho = results.NoEcho;
    if (event.RequestType !== "Delete" && results.hasOwnProperty("Data"))
      response.Data = (results as SuccessResponse).Data;

    return response as CloudFormationCustomResourceSuccessResponse;
  }

  public static handleError({
    event,
    Reason
  }: {
    event: CloudFormationCustomResourceEvent;
    Reason: string;
  }) {
    const response = CustomProvider.prepareResponse(event, { Status: "FAILED", Reason });
    return send({ url: event.ResponseURL, data: JSON.stringify(response) });
  }

  private create: CreateEventHandler;
  private update: UpdateEventHandler;
  private delete: DeleteEventHandler;

  constructor(params: CustomProviderParams) {
    const { create, update, delete: DELETE } = params || {};
    if (typeof create !== "function" || create.length !== 1)
      debug("create handler must be a function. usind default 'fail' handler");
    if (typeof update !== "function" || update.length !== 1)
      debug("update handler must be a function. usind default 'fail' handler");
    if (typeof DELETE !== "function" || DELETE.length !== 1)
      debug("delete handler must be a function. usind default 'fail' handler");
    this.create = !!create ? create : defaultHandler("create");
    this.update = !!update ? update : defaultHandler("update");
    this.delete = !!DELETE ? DELETE : defaultHandler("delete");
    Object.freeze(this);
  }

  public async handle(event: CloudFormationCustomResourceEvent): Promise<void> {
    let response!: CloudFormationCustomResourceResponse;
    try {
      debug(event);
      let results: Results;
      switch (event.RequestType) {
        case "Create":
          results = await this.create(event);
          break;
        case "Update":
          results = await this.update(event);
          break;
        case "Delete":
          results = await this.delete(event);
          break;
        default:
          results = {
            Status: "FAILED",
            Reason: "invalid event.RequestType"
          };
      }
      debug(results);
      response = CustomProvider.prepareResponse(event, results as Results);
    } catch (err) {
      debug(err);
      response = CustomProvider.prepareResponse(event, {
        Status: "FAILED",
        Reason: PROD ? "unknown error occured" : err.message
      });
    } finally {
      debug(response);
      await send({ url: event.ResponseURL, data: JSON.stringify(response) });
    }
  }
}
