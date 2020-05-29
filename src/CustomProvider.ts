import { Debug } from "./utils";
const debug = Debug(__dirname, __filename);
import { parse } from "url";
import { request } from "https";
import { generate as Generate } from "shortid";
const generate = () => Generate().replace(/[-_]/g, `${Math.floor(Math.random() * 10)}`);
import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceUpdateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceFailedResponse,
  CloudFormationCustomResourceSuccessResponse,
  Context
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

interface SendResponseParams {
  url: string;
  data: string;
}
interface HandlerResponse {
  statusCode: number;
  data?: CloudFormationCustomResourceResponse;
}

export function send({ url, data }: SendResponseParams) {
  return new Promise<HandlerResponse>((resolve, reject) => {
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
        resolve({ statusCode: response.statusCode || 500 });
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

type CustomProviderHandler = (
  event: CloudFormationCustomResourceEvent,
  context?: Context
) => Promise<HandlerResponse>;

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
    debug("handleError: ", { event, Reason });
    const response = CustomProvider.prepareResponse(event, { Status: "FAILED", Reason });
    return send({ url: event.ResponseURL, data: JSON.stringify(response) });
  }

  private _send = send;
  private create: CreateEventHandler;
  private update: UpdateEventHandler;
  private delete: DeleteEventHandler;

  constructor(params: CustomProviderParams) {
    debug("constructor params: ", { params });
    const { create, update, delete: _delete } = params || {};
    /**
     * validate params. verify that create, update and delete are
     * functions and take a single argument. if not add the default
     * handler that returns an  error saying the handler wasnt
     * implemented correctly
     */
    if (typeof create !== "function" || create.length !== 1)
      debug("create handler must be a function. usind default 'fail' handler");
    this.create = !!create ? create : defaultHandler("create");

    if (typeof update !== "function" || update.length !== 1)
      debug("update handler must be a function. usind default 'fail' handler");
    this.update = !!update ? update : defaultHandler("update");

    if (typeof _delete !== "function" || _delete.length !== 1)
      debug("delete handler must be a function. usind default 'fail' handler");
    this.delete = !!_delete ? _delete : defaultHandler("delete");

    Object.freeze(this);
  }

  public handle: CustomProviderHandler = (event, context) =>
    new Promise<HandlerResponse>(async resolve => {
      let timer: undefined | NodeJS.Timeout;
      if (!!context) {
        timer = setTimeout(async () => {
          const res = CustomProvider.prepareResponse(event, {
            Status: "FAILED",
            Reason: "resource provider timed out"
          });
          resolve(await this._send({ url: event.ResponseURL, data: JSON.stringify(res) }));
        }, context.getRemainingTimeInMillis() - 1000);
      }

      let response!: CloudFormationCustomResourceResponse;
      try {
        debug({ event });
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
        debug({ results });
        response = CustomProvider.prepareResponse(event, results as Results);
      } catch (err) {
        debug({ err });
        response = CustomProvider.prepareResponse(event, {
          Status: "FAILED",
          Reason: PROD ? "unknown error occured" : err.message
        });
      } finally {
        debug({ response });
        if (timer) clearTimeout(timer);
        resolve(await this._send({ url: event.ResponseURL, data: JSON.stringify(response) }));
      }
    });
}
