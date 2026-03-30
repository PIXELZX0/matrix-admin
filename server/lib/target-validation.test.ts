// @vitest-environment node

import { lookup } from "node:dns/promises";

import { describe, expect, it, vi } from "vitest";

import { HttpError } from "./http-error";
import { assertAllowedBaseUrl } from "./target-validation";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

describe("assertAllowedBaseUrl", () => {
  it("accepts public homeserver addresses", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }] as never);

    await expect(assertAllowedBaseUrl("https://matrix.example.com", false)).resolves.toBe(
      "https://matrix.example.com"
    );
  });

  it("rejects private targets when private access is disabled", async () => {
    vi.mocked(lookup).mockResolvedValueOnce([{ address: "10.0.0.5", family: 4 }] as never);

    await expect(assertAllowedBaseUrl("https://internal.example.com", false)).rejects.toBeInstanceOf(HttpError);
  });
});
