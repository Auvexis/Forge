import crypto from "node:crypto";

type HashAlgorithm = "sha256" | "sha512" | "md5";
type Encoding = "hex" | "base64";

export function createMethods() {
  return {
    async hash(params: { input: string; algorithm?: HashAlgorithm; encoding?: Encoding }) {
      const alg = params.algorithm ?? "sha256";
      const enc = params.encoding ?? "hex";
      const hash = crypto.createHash(alg).update(params.input).digest(enc);
      return { hash, algorithm: alg, encoding: enc };
    },

    async hmac(params: {
      message: string;
      secret: string;
      algorithm?: "sha256" | "sha512";
      encoding?: Encoding;
    }) {
      const alg = params.algorithm ?? "sha256";
      const enc = params.encoding ?? "hex";
      const mac = crypto
        .createHmac(alg, params.secret)
        .update(params.message)
        .digest(enc);
      return { hmac: mac, algorithm: alg, encoding: enc };
    },

    async base64Encode(params: { input: string }) {
      return { encoded: Buffer.from(params.input, "utf8").toString("base64") };
    },

    async base64Decode(params: { input: string }) {
      return { decoded: Buffer.from(params.input, "base64").toString("utf8") };
    },

    async generateUUID(_params: Record<string, never>) {
      return { uuid: crypto.randomUUID() };
    },

    async generateRandomString(params: { bytes?: number }) {
      const bytes = params.bytes ?? 16;
      return { value: crypto.randomBytes(bytes).toString("hex"), bytes };
    },
  };
}
