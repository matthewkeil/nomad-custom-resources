import { Debug } from "../../src/utils";
const debug = Debug(__dirname, __filename);
import { ACM } from "aws-sdk";
import { acm } from "../../config";
import { normalizeDomain } from "../normalizeDomain";

const extractSubdomains = (domain: string, base?: string) => {
  const result = normalizeDomain(domain).replace(normalizeDomain(base), "");
  return result.endsWith(".") ? result.slice(0, -1) : result;
};

export const getCertificateForDomain = async (
  domain: string
): Promise<ACM.DescribeCertificateResponse> => {
  async function finalize(Certificate: undefined | ACM.CertificateDetail) {
    if (!Certificate?.CertificateArn) return {};
    return await acm.describeCertificate({ CertificateArn: Certificate.CertificateArn }).promise();
  }
  const { CertificateSummaryList = [] } = await acm.listCertificates().promise();
  const certSummary = CertificateSummaryList.find(({ DomainName }) =>
    normalizeDomain(domain).endsWith(normalizeDomain(DomainName))
  );
  if (certSummary) {
    const { CertificateArn = "" } = certSummary;
    const { Certificate } = await acm.describeCertificate({ CertificateArn }).promise();
    const subDomain = extractSubdomains(domain, Certificate?.DomainName);
    if (subDomain !== "") {
      if (Certificate?.SubjectAlternativeNames && Certificate.SubjectAlternativeNames.length) {
        const match = Certificate.SubjectAlternativeNames.find(altName => {
          const altSubDomain = extractSubdomains(altName, Certificate.DomainName);
          if (altSubDomain === "*") return true;
          if (altSubDomain === subDomain) return true;
        });
        if (match) return finalize(Certificate);
      }
      return {};
    }
    return finalize(Certificate);
  }
  return {};
};
