export const normalizeDomain = (domain = "") =>
  domain
    .toLowerCase()
    .split(".")
    .filter(zone => !!zone)
    .join(".");
