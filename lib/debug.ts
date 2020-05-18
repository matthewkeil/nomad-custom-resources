import DEBUG from "debug";
import { sep } from "path";

export { DEBUG };
export const Debug = (dirName = "", fileName = "") => {
  const ROOT = __dirname;
  const path = dirName
    .replace(ROOT, "")
    .split(sep)
    .concat(fileName.split(".").shift() || "")
    .filter(segment => segment !== "");
  return DEBUG(path.join(":"));
};
