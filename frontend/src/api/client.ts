const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  "http://localhost:8001/api/v1";

const TOKEN_KEY = "ayush_ai_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function userFacingMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.detail || fallback;
  }
  return fallback;
}

export function httpStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request was invalid. Please check the submitted data.";
    case 401:
      return "Authentication failed. Please log in again.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This resource already exists. The request conflicts with current data.";
    case 413:
      return "The uploaded file is too large.";
    case 422:
      return "The submitted data could not be processed. Check the fields.";
    case 429:
      return "Rate limit exceeded. Please wait a moment and try again.";
    case 500:
      return "A server error occurred. Please try again later.";
    case 502:
      return "The AI provider failed to respond. Please try again.";
    case 503:
      return "The service is temporarily unavailable. Please try again later.";
    default:
      return "An unexpected error occurred.";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  timeoutMs = 45000
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError(408, "The request timed out. Please try again.");
    }
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  } finally {
    clearTimeout(timeout);
  }

  // Handle 401 token expiry -> force logout
  if (res.status === 401) {
    clearToken();
    window.dispatchEvent(new Event("ayush-auth-expired"));
  }

  let body: any = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const detail =
      (body && (body.detail || body.message)) || httpStatusMessage(res.status);
    throw new ApiError(res.status, typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, timeoutMs?: number) =>
    request<T>(path, { method: "GET" }, timeoutMs),

  post: <T>(path: string, body?: unknown, timeoutMs?: number) =>
    request<T>(
      path,
      { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) },
      timeoutMs
    ),

  put: <T>(path: string, body?: unknown, timeoutMs?: number) =>
    request<T>(
      path,
      { method: "PUT", body: body === undefined ? undefined : JSON.stringify(body) },
      timeoutMs
    ),

  upload: <T>(path: string, formData: FormData, timeoutMs?: number) =>
    request<T>(path, { method: "POST", body: formData }, timeoutMs),
};

export { API_BASE_URL };