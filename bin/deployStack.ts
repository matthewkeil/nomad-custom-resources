import { Debug } from "../src/utils";
const debug = Debug(__dirname, __filename);
import { generate as Generate } from "shortid";
const generate = () => Generate().replace(/-_/g, `${Math.floor(Math.random() * 10)}`);
import { createTestStack, deleteTestStack } from "../test/utils";

if (require.main === module) {
  createTestStack("1234", "ohy108tzY").then(stack => {
    console.log(stack);
    // deleteTestStack("1234", "ohy108tzY")
    //   .then(console.log)
    //   .catch(console.error);
  });
}
