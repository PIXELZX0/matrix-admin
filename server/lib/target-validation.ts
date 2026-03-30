import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

import ipaddr from "ipaddr.js";

import { HttpError } from "./http-error";

const metadataAddresses = new Set([
  "100.100.100.200",
  "169.254.169.254",
  "169.254.170.2",
]);

const blockedHostnames = new Set(["localhost"]);

const normalizeIpRange = (value: ipaddr.IPv4 | ipaddr.IPv6) => {
  if (value.kind() === "ipv6") {
    const ipv6 = value as ipaddr.IPv6;

    if (ipv6.isIPv4MappedAddress()) {
      return ipv6.toIPv4Address().range();
    }
  }

  return value.range();
};

const normalizeIpString = (value: ipaddr.IPv4 | ipaddr.IPv6) => {
  if (value.kind() === "ipv6") {
    const ipv6 = value as ipaddr.IPv6;

    if (ipv6.isIPv4MappedAddress()) {
      return ipv6.toIPv4Address().toString();
    }
  }

  return value.toString();
};

const isAddressAllowed = (address: string, allowPrivateTargets: boolean) => {
  const parsed = ipaddr.parse(address);
  const normalizedAddress = normalizeIpString(parsed);
  const range = normalizeIpRange(parsed);

  if (metadataAddresses.has(normalizedAddress)) {
    return false;
  }

  if (range === "unicast") {
    return true;
  }

  if ((range === "private" || range === "uniqueLocal") && allowPrivateTargets) {
    return true;
  }

  return false;
};

const resolveTargetAddresses = async (hostname: string) => {
  if (isIP(hostname)) {
    return [hostname];
  }

  if (blockedHostnames.has(hostname.toLowerCase()) || hostname.toLowerCase().endsWith(".localhost")) {
    return [];
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map(record => record.address);
};

export const normalizeBaseUrl = (input: string) => {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new HttpError("Invalid homeserver URL.", 400);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new HttpError("Homeserver URL must use http or https.", 400);
  }

  if (url.username || url.password) {
    throw new HttpError("Homeserver URL must not include credentials.", 400);
  }

  const normalizedPath = url.pathname.replace(/\/+$/g, "");

  return `${url.origin}${normalizedPath === "/" ? "" : normalizedPath}`;
};

export const assertAllowedBaseUrl = async (input: string, allowPrivateTargets: boolean) => {
  const normalizedBaseUrl = normalizeBaseUrl(input);
  const url = new URL(normalizedBaseUrl);
  const addresses = await resolveTargetAddresses(url.hostname);

  if (addresses.length === 0) {
    throw new HttpError("Homeserver hostname did not resolve to an allowed target.", 400);
  }

  for (const address of addresses) {
    if (!isAddressAllowed(address, allowPrivateTargets)) {
      throw new HttpError("Homeserver target is not allowed by the SSRF policy.", 400, { address });
    }
  }

  return normalizedBaseUrl;
};
