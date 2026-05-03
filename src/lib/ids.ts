import crypto from "node:crypto";

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomBytes(12).toString("hex")}`;
}

export function randomCode() {
  return crypto.randomBytes(9).toString("base64url").toUpperCase();
}

export function sha256(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}
