const sessionCookieName = "neighborly_session";
export const sessionHeaderName = "x-neighborly-session";
const sessionCookieMaxAgeSeconds = 60 * 60 * 24 * 30;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const signingKeyCache = new Map<string, Promise<CryptoKey>>();

/** Encodes binary signature bytes as lowercase hexadecimal text. */
function hexEncode(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Parses the Cookie header into a simple name/value map. */
function parseCookies(cookieHeader: string | null) {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader
      .split(";")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf("=");

        if (separatorIndex === -1) {
          return [entry, ""];
        }

        const cookieName = entry.slice(0, separatorIndex);
        const cookieValue = entry.slice(separatorIndex + 1);

        return [
          safeDecodeURIComponent(cookieName),
          safeDecodeURIComponent(cookieValue),
        ];
      }),
  );
}

/** Decodes percent-encoding without throwing on malformed cookie values. */
function safeDecodeURIComponent(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** Compares two strings without leaking the mismatch position via timing. */
function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}

/** Signs a session id with HMAC-SHA256 using the configured server secret. */
async function signSessionId(sessionId: string, secret: string) {
  const encoder = new TextEncoder();
  const existingSecretKeyPromise = signingKeyCache.get(secret);
  const secretKeyPromise =
    existingSecretKeyPromise ??
    crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { hash: "SHA-256", name: "HMAC" },
      false,
      ["sign"],
    );

  if (!existingSecretKeyPromise) {
    signingKeyCache.set(secret, secretKeyPromise);
  }

  const secretKey = await secretKeyPromise;
  const signature = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(sessionId));
  return hexEncode(new Uint8Array(signature));
}

/** Combines the session id and signature into the cookie token value. */
function buildSessionToken(sessionId: string, signature: string) {
  return `${sessionId}.${signature}`;
}

/** Creates a signed, secure cookie header for a new browser session. */
export async function createSignedSessionCookie(secret: string) {
  const sessionId = crypto.randomUUID();
  const signature = await signSessionId(sessionId, secret);
  const token = buildSessionToken(sessionId, signature);

  return {
    sessionId,
    sessionToken: token,
    setCookieHeader: [
      `${sessionCookieName}=${encodeURIComponent(token)}`,
      "HttpOnly",
      `Max-Age=${sessionCookieMaxAgeSeconds}`,
      "Path=/",
      "SameSite=None",
      "Secure",
    ].join("; "),
  };
}

/** Reads the signed session token from the cookie first, then the fallback header. */
function readSessionToken(request: Request) {
  const cookies = parseCookies(request.headers.get("cookie"));
  const cookieToken = cookies[sessionCookieName];

  if (cookieToken) {
    return cookieToken;
  }

  return request.headers.get(sessionHeaderName)?.trim() ?? null;
}

/** Verifies the signed session token and returns the trusted session details. */
export async function readVerifiedSession(request: Request, secret: string) {
  const token = readSessionToken(request);

  if (!token) {
    return null;
  }

  const separatorIndex = token.indexOf(".");

  if (separatorIndex === -1) {
    return null;
  }

  const sessionId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);

  if (!uuidPattern.test(sessionId)) {
    return null;
  }

  const expectedSignature = await signSessionId(sessionId, secret);

  return constantTimeEqual(signature, expectedSignature)
    ? {
      sessionId,
      sessionToken: token,
    }
    : null;
}
