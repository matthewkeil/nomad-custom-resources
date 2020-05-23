import { Debug } from "../../src/utils";
const debug = Debug(__dirname, __filename);
import { ACM } from "aws-sdk";
import { acm } from "../../config";
import { updateCertificateTags } from "./updateCertificateTags";

interface UpdateCertificateParams {
  CertificateArn: string;
  Options?: ACM.CertificateOptions;
  Tags?: ACM.TagList;
}

export const updateCertificate = async ({
  CertificateArn,
  Options,
  Tags = []
}: UpdateCertificateParams) => {
  debug({ CertificateArn, Options, Tags });
  await updateCertificateTags({ CertificateArn, Tags });
  if (Options) await acm.updateCertificateOptions({ CertificateArn, Options }).promise();
  const { Certificate } = await acm.describeCertificate({ CertificateArn }).promise();
  debug("Certificate: ", Certificate);

  return Certificate;
};
