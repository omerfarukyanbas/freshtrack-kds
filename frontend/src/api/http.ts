/** FastAPI hata gövdesinden okunabilir mesaj (ham metin). */
export function parseErrorDetailFromText(text: string): string {
  const trimmed = text?.trim();
  if (!trimmed) return "İstek başarısız";
  try {
    const j = JSON.parse(trimmed) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((x) =>
          typeof x === "object" && x && "msg" in x ? String((x as { msg: string }).msg) : String(x),
        )
        .join("; ");
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

/** FastAPI hata gövdesinden okunabilir mesaj (Response). */
export async function parseApiError(res: Response): Promise<string> {
  const text = await res.text();
  return parseErrorDetailFromText(text);
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export class NoAuthTokenError extends Error {
  constructor(message = "Oturum bulunamadı") {
    super(message);
    this.name = "NoAuthTokenError";
  }
}

const TOKEN_KEY = "freshtrack_access_token";

/** Oturum gerektiren istekler için. Token yoksa istek atılmaz. */
export function bearerAuthHeaders(): HeadersInit {
  const t = localStorage.getItem(TOKEN_KEY)?.trim();
  if (!t) {
    throw new NoAuthTokenError();
  }
  return { Authorization: `Bearer ${t}` };
}

/** İsteğe bağlı: token varsa Bearer ekler. */
export function authHeaders(): HeadersInit {
  const t = localStorage.getItem(TOKEN_KEY)?.trim();
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

export function isUnauthorizedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

export function isNoAuthTokenError(error: unknown): boolean {
  return error instanceof NoAuthTokenError;
}

/** Login sayfasına yönlendirme: 401 veya token yok. */
export function shouldRedirectToLogin(error: unknown): boolean {
  return isUnauthorizedError(error) || isNoAuthTokenError(error);
}

const defaultFetchInit: RequestInit = {
  mode: "cors",
  cache: "no-store",
};

function requestBodyForLog(init?: RequestInit): string | undefined {
  const b = init?.body;
  if (typeof b === "string") return b;
  return undefined;
}

/**
 * Tam URL ile fetch; istek gövdesi ve hatalar konsola yazılır.
 */
export async function fetchWithApiLog(url: string, init?: RequestInit): Promise<Response> {
  const merged: RequestInit = { ...defaultFetchInit, ...init };
  const bodyStr = requestBodyForLog(merged);
  console.log("[API] request", {
    url,
    method: merged.method ?? "GET",
    ...(bodyStr !== undefined ? { body: bodyStr } : {}),
  });
  try {
    const res = await fetch(url, merged);
    const ct = res.headers.get("content-type") ?? "";
    console.log("[API] response", { url, status: res.status, contentType: ct });
    return res;
  } catch (err) {
    const name = err instanceof Error ? err.name : typeof err;
    const message = err instanceof Error ? err.message : String(err);
    console.log("[API] fetch error", {
      url,
      requestBody: bodyStr,
      errorName: name,
      errorMessage: message,
      error: err,
    });
    console.error("[API] Failed to fetch", { url, error: err });
    throw err;
  }
}

/**
 * JSON API yanıtı: HTTP hata kodunda body konsola yazılır.
 */
export async function readApiJson<T>(res: Response, requestUrl: string): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    console.log("[API] error body", { url: requestUrl, status: res.status, body: text });
    console.error("[API]", requestUrl, res.status, text);
    throw new ApiError(res.status, parseErrorDetailFromText(text));
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
