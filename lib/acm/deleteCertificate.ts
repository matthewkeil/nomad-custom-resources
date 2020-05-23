import { Debug } from "../../src/utils";
const debug = Debug(__dirname, __filename);
import { ACM } from "aws-sdk";
import { acm } from "../../config";

export const deleteCertificate = async ({ CertificateArn }: ACM.DeleteCertificateRequest) => {
  try {
    const response = await acm.deleteCertificate({ CertificateArn }).promise();
  } catch (err) {
    // check for conditions where a certificate wont delete and run again...
    debug(err);
  }
};
