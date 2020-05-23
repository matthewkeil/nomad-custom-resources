import { Fn } from "cloudform";
import { CustomResourceProvider } from "./CustomResourceProvider";
import { CustomResourceProviderLogGroup } from "./CustomResourceProviderLogGroup";
import { CustomResourceProviderRole } from "./CustomResourceProviderRole";

export const buildStackTemplate = ({ StackName }: { StackName: string }) => {
  const template = {
    AWSTemplateFormatVersion: "2010-09-09",
    Description: `${StackName} the stack. coming soon nomad-custom-resources the breakfast cereal`,
    Resources: {
      CustomResourceProvider,
      CustomResourceProviderRole,
      CustomResourceProviderLogGroup
    },
    Outputs: {
      CustomResourceProvider: {
        Description: "Your nomad-devops CustomResource provider",
        Value: Fn.GetAtt("CustomResourceProvider", "Arn"),
        Export: {
          Name: "NomadDevopsCustomResourceProvider"
        }
      }
    }
  };
  return template;
};
