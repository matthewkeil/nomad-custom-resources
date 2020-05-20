import { Debug } from "./debug";
const debug = Debug(__dirname, __filename);
import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceUpdateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse
} from "aws-lambda";
import Axios from "axios";
import { generate } from "shortid";

interface FailedResponse {
  Status: "FAILED";
  Reason: string;
}

interface SuccessResponse {
  Status: "SUCCESS";
  Data?: { [key: string]: string };
  Reason?: string;
}

type Results = SuccessResponse | FailedResponse;

export abstract class CustomResource {
  protected abstract create: (
    event: CloudFormationCustomResourceCreateEvent
  ) => Promise<CloudFormationCustomResourceResponse>;

  protected abstract update: (
    event: CloudFormationCustomResourceUpdateEvent
  ) => Promise<CloudFormationCustomResourceResponse>;

  protected abstract delete: (
    event: CloudFormationCustomResourceDeleteEvent
  ) => Promise<CloudFormationCustomResourceResponse>;
  public async handle(event: CloudFormationCustomResourceEvent): Promise<void> {
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
      await this.sendResults(event, results as Results);
    } catch (err) {
      this.sendResults(event, {
        Status: "FAILED",
        Reason: JSON.stringify(err)
      });
    }
  }

  private async sendResults(event: CloudFormationCustomResourceEvent, results: Results) {
    const {
      StackId,
      RequestId,
      LogicalResourceId,
      PhysicalResourceId
    } = event as CloudFormationCustomResourceUpdateEvent;
    const response: Partial<CloudFormationCustomResourceResponse> = {
      ...results,
      StackId,
      RequestId,
      LogicalResourceId
    };

    debug("event.PhysicalResourceId: ", PhysicalResourceId);
    if (PhysicalResourceId && PhysicalResourceId?.length) {
      response.PhysicalResourceId = `NomadDevops-${event.ResourceType.split(
        "::"
      ).pop()}-${generate()}`;
      debug("setting response.PhysicalResourceId to: ", (response as any).PhysicalResourceId);
    }

    if (!response.Status) response.Status = "FAILED";

    if (!response.Reason?.length) {
      response.Reason =
        response.Status === "SUCCESS"
          ? "enjoy! https://devops.nomad.house"
          : "unknown reason for failure";
    }

    if (response.Status === "FAILED" && response.Data) delete response.Data;

    return Axios({
      url: event.ResponseURL,
      method: "PUT",
      headers: {
        "Content-Type": ""
      },
      data: JSON.stringify(response)
    }).catch(err => {
      console.error("error sending response to cloudformation s3 url\n", err);
    });
  }
}
