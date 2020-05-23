import { buildHandler } from "../src/handler";
import { testResources } from "./testResources";

export const handler = buildHandler(testResources);
