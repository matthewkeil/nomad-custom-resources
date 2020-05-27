import DEBUG from "debug";
const debug = DEBUG("nomad:resources:src:utils");
import { resolve, sep } from "path";

export { DEBUG };
export const Debug = (dirName = "", fileName = "") => {
  const ROOT = resolve(__dirname, "..");
  const path = ["nomad", "resources"]
    .concat(
      dirName
        .replace(ROOT, "")
        .split(sep)
        .filter(segment => segment !== "")
        .concat(
          fileName
            .split("/")
            .pop()
            ?.split(".")
            .shift() || ""
        )
    )
    .join(":");
  debug({ dirName, fileName, ROOT, path });
  return DEBUG(path);
};
