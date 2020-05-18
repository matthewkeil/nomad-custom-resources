require("dotenv").config();
import { ACM, CloudFormation, Route53, S3 } from "aws-sdk";

const AWS_SERVICE_CONFIG = {
  region: process.env.REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
};

export const config = {
  PUBLIC_BUCKET: `${process.env.PUBLIC_BUCKET}`,
  BUNDLE_KEY: `${process.env.BUNDLE_KEY}`,
  acm: new ACM(AWS_SERVICE_CONFIG),
  cloudformation: new CloudFormation(AWS_SERVICE_CONFIG),
  route53: new Route53(AWS_SERVICE_CONFIG),
  s3: new S3(AWS_SERVICE_CONFIG),
};
