import { Debug } from "../debug";
const debug = Debug(__dirname, __filename);
import { ACM } from "aws-sdk";
import { config } from "../../config";

export const deleteCertificate = async ({ CertificateArn }: ACM.DeleteCertificateRequest) => {
  try {
    const response = await config.acm.deleteCertificate({ CertificateArn }).promise();
  } catch (err) {
    // check for conditions where a certificate wont delete and run again...
    debug(err);
  }
};
