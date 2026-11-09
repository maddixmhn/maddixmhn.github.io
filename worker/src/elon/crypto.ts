import { HttpError } from "../env";

function toBytes(base64: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function key(master: string | undefined): Promise<CryptoKey> {
  if (!master) throw new HttpError(503, "elon_master_key_missing");
  const raw = toBytes(master);
  if (raw.length !== 32) throw new HttpError(503, "elon_master_key_invalid");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(master: string | undefined, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await key(master), new TextEncoder().encode(plain));
  return `${toBase64(iv)}.${toBase64(new Uint8Array(data))}`;
}

export async function open(master: string | undefined, sealed: string): Promise<string> {
  const [iv, data] = sealed.split(".");
  if (!iv || !data) throw new HttpError(502, "elon_secret_corrupt");
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: toBytes(iv) }, await key(master), toBytes(data));
  return new TextDecoder().decode(plain);
}
