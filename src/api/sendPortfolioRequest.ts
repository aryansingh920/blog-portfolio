// api/sendPortfolioRequest.ts
// Best-practice: keep API calls out of UI, typed payload, AbortController support, robust error handling.
import {Constants} from "../constants/constants";
export type PortfolioRequestBody = {
  name: string;
  email: string;
  phone?: string;
  inquiry: string;
  // You can add more fields later (budget, timeline, etc.)
};

export type PortfolioRequestSuccess = {
  ok: true;
  message?: string;
  id?: string;
};

export type PortfolioRequestFailure = {
  ok: false;
  error: string;
  status?: number;
};

const ENDPOINT: string = Constants.uri;


/**
 * Sends the contact form payload to your external service.
 * - Uses AbortController (pass signal from UI for cancellation)
 * - Throws a readable error on non-2xx
 */
export async function sendPortfolioRequest(
  body: PortfolioRequestBody,
  opts?: { signal?: AbortSignal },
): Promise<PortfolioRequestSuccess> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    signal: opts?.signal,
    // External URL => don't use Next cache
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!res.ok) {
    const backendMsg =
      (data?.error as string) ||
      (data?.message as string) ||
      `Request failed (${res.status})`;
    const err = new Error(backendMsg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  return {
    ok: true,
    message: (data?.message as string) || "Sent. I’ll get back to you.",
    id: (data?.id as string) || undefined,
  };
}
