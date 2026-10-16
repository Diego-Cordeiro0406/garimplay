export async function verifySchedule(
  time: string,
  nonce: string,
  signature: string,
  secret: string,
  now = Date.now()
) {
  if (
    !/^\d{10}$/.test(time) ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(nonce) ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    Math.abs(now - Number(time) * 1000) > 90_000
  )
    return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const bytes = Uint8Array.from(signature.match(/../g)!, (value) => parseInt(value, 16));
  return crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(`${time}:${nonce}`));
}
