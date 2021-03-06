import { Fn, IAM } from "cloudform";

const logsStatement = {
  Effect: "Allow",
  Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
  Resource: Fn.GetAtt("CustomResourceProviderLogGroup", "Arn")
};
const snsStatement = {
  Effect: "Allow",
  Action: "sns:Publish",
  Resource: Fn.Ref("DeadLetterQueTopic")
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
  RoleName: Fn.Join("", ["nomad-custom-resource-provider-role", Fn.Ref("UUID")]),
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
      PolicyName: Fn.Join("", ["nomad-custom-resource-provider-policy", Fn.Ref("UUID")]),
      PolicyDocument: {
        Version: "2012-10-17",
        Statement: [snsStatement, logsStatement, acmStatement, route53Statement]
      }
    }
  ]
}).dependsOn(["DeadLetterQueTopic", "CustomResourceProviderLogGroup"]);
