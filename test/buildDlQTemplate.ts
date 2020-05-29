import CF, { Fn } from "cloudform";
import { RUN_PREFIX } from "./utils";

export const buildDlQTemplate = (uuid = RUN_PREFIX) =>
  CF({
    AWSTemplateFormatVersion: "2010-09-09",
    Description: "dlq test stack. should fail and trigger dlq response",
    Resources: {
      DlqError: {
        Type: "Custom::DlqError",
        Properties: {
          ServiceToken: Fn.ImportValue(`NomadDevopsCustomResourceProvider-${uuid}`)
        }
      }
    }
  });
