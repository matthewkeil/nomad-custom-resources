import { Debug } from "../../src/debug";
const debug = Debug(__dirname, __filename);
import { ACM } from "aws-sdk";
import { createCertRecordSet, getHostedZoneForDomain } from "../route53";
import { config } from "../../config";

export const requestCertificate = async ({
  DomainName,
  IdempotencyToken,
  Tags,
  DomainValidationOptions,
  Options,
  SubjectAlternativeNames
}: Partial<ACM.RequestCertificateRequest>) => {
  const params: ACM.RequestCertificateRequest = {
    DomainName,
    IdempotencyToken,
    SubjectAlternativeNames: [`*.${DomainName}`],
    ValidationMethod: "DNS",
    Options: { ...Options, CertificateTransparencyLoggingPreference: "ENABLED" }
  };
  if (Tags) params.Tags = Tags;
  if (DomainValidationOptions) params.DomainValidationOptions = DomainValidationOptions;
  if (SubjectAlternativeNames?.length) {
    for (const alt of SubjectAlternativeNames) {
      if (alt !== params.SubjectAlternativeNames[0]) {
        SubjectAlternativeNames.push(alt);
      }
    }
  }
  debug("request params: ", params);
  const { CertificateArn } = await config.acm.requestCertificate(params).promise();
  debug("CertificateArn: ", CertificateArn);
  const { Certificate } = await config.acm.describeCertificate({ CertificateArn }).promise();
  debug("Certificate: ", Certificate);
  const { Id } = await getHostedZoneForDomain(DomainName);
  debug("HostedZoneId", Id);
  const dnsValidationOptions = Certificate.DomainValidationOptions.filter(option => {
    if (option.ValidationMethod.toLowerCase() === "dns") return true;
  });
  debug("dnsValidationOptions", dnsValidationOptions);

  for (const option of dnsValidationOptions) {
    await createCertRecordSet({
      HostedZoneId: Id.split("/").pop(),
      recordSetName: option.ResourceRecord.Name,
      recordSetValue: option.ResourceRecord.Value
    });
  }

  return Certificate;
};
