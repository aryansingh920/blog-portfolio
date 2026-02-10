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

const ENDPOINT: string = `${Constants.uri}/email/portfolio/form`;


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

  // console.log(res.body);

  const data = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  // console.log(data);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const okField = (data as any)?.ok;
  if (okField === false) {
    const backendMsg =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((data as any)?.error as string) ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((data as any)?.message as string) ||
      "Request failed";
    const err = new Error(backendMsg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

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
