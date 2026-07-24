import { describe, expect, it } from "vitest";

import { PublicUrlService } from "./public-url-service.ts";

describe("PublicUrlService.validate", () => {
  it("normalizes absolute public URLs to origin-only values", () => {
    expect(PublicUrlService.validate("https://fabric.example.com/")).toBe("https://fabric.example.com");
    expect(PublicUrlService.validate("http://localhost:23801")).toBe("http://localhost:23801");
  });

  it("rejects unsafe public URLs outside localhost and private LANs", () => {
    expect(() => PublicUrlService.validate("http://fabric.example.com")).toThrow(/HTTPS/);
    expect(() => PublicUrlService.validate("https://fabric.example.com/path")).toThrow(/only protocol/);
  });
});
