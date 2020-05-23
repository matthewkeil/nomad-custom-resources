import { Fn, IAM } from "cloudform";
import { BRANCH } from "../config";

const logsStatement = {
  Effect: "Allow",
  Action: "logs:*",
  Resource: Fn.GetAtt("CustomResourceProviderLogGroup", "Arn")
};
const acmStatement = {
  Effect: "Allow",
  Action: [
    "acm:ListCertificates",
    "acm:DeleteCertificate",
    "acm:RequestCertificate",
    "acm:DescribeCertificate",
    "acm:AddTagsToCertificate",
    "acm:ListTagsForCertificate",
    "acm:UpdateCertificateOptions",
    "acm:RemoveTagsFromCertificate"
  ],
  Resource: "arn:aws:acm:*:*:*"
};
const route53Statement = {
  Effect: "Allow",
  Action: [
    "route53:CreateHostedZone",
    "route53:DeleteHostedZone",
    "route53:GetHostedZone",
    "route53:ListHostedZones",
    "route53:UpdateHostedZoneComment",
    "route53:ListHostedZonesByName",
    "route53:CreateReusableDelegationSet",
    "route53:GetReusableDelegationSet",
    "route53:ListReusableDelegationSets",
    "route53:DeleteReusableDelegationSets",
    "route53:ChangeResourceRecordSets",
    "route53:ListResourceRecordSacmStatement",
    "route53:ChangeTagsForResource",
    "route53:ListTagsForResource",
    "route53domains:DeleteTagsForDomain",
    "route53domains:ListTagsForDomain",
    "route53domains:UpdateTagsForDomain",
    "route53:AssociateVPCWithHostedZone",
    "route53:DisassociateVPCFromHostedZone",
    "route53:AssociateVPCWithHostedZone",
    "route53:AssociateVPCWithHostedZone",
    "route53:AssociateVPCWithHostedZone"
  ],
  Resource: "arn:aws:route53:::*"
};

export const CustomResourceProviderRole = new IAM.Role({
  RoleName: "nomad-custom-resource-provider-role".concat(BRANCH ? `${BRANCH}` : ""),
  AssumeRolePolicyDocument: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: "sts:AssumeRole",
        Principal: {
          Service: "lambda.amazonaws.com"
        }
      }
    ]
  },
  Policies: [
    {
      PolicyName: "nomad-custom-resource-provider-policy".concat(BRANCH ? `${BRANCH}` : ""),
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [logsStatement, acmStatement, route53Statement]
      }
    }
  ]
});
