import { Debug } from "./debug";
const debug = Debug(__dirname, __filename);
import { CloudFormationCustomResourceEvent } from "aws-lambda";
import {
  CustomProvider,
  CreateEventHandler,
  UpdateEventHandler,
  DeleteEventHandler
} from "./CustomProvider";
import { handleRecordSet } from "../lib/route53";

const hanldleEvent = async (event: CloudFormationCustomResourceEvent) => {
  const response = await handleRecordSet({
    ...(event.ResourceProperties as any),
    RequestType: event.RequestType
  });
  debug("ChangeInfo: ", response?.ChangeInfo);
  return {
    Status: "SUCCESS",
    Data: {
      Name: event.ResourceProperties.Name
    }
  };
};

export const recordSetProvider = new CustomProvider({
  create: hanldleEvent as CreateEventHandler,
  update: hanldleEvent as UpdateEventHandler,
  delete: hanldleEvent as DeleteEventHandler
});
