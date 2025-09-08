import { SignJWT, jwtVerify } from "jose";

const alg = "HS256";
function secretKey() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("Missing AUTH_SECRET");
  return new TextEncoder().encode(s);
}

export async function signToken(payload: { id: string; name: string }, ttl = "7d") {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(ttl)
    .sign(secretKey());
}

export type TokenPayload = { id: string; name: string; iat: number; exp: number };

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as TokenPayload;
  } catch {
    return null;
  }
}