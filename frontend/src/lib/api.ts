export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isForm = init?.body instanceof FormData;
  const headers = new Headers(init?.headers);
  if (!isForm && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, { ...init, headers });
  } catch (reason) {
    if (reason instanceof Error && reason.name === "AbortError") throw reason;
    throw new Error("Couldn't connect to the server. Check your connection and try again.");
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const validation = Array.isArray(body?.detail)
      ? body.detail.flatMap((issue: { loc?: unknown[]; msg?: unknown }) => {
          if (!issue || typeof issue.msg !== "string") return [];
          const field = issue.loc?.filter((part) => part !== "body").join(" ").replaceAll("_", " ");
          return [field ? `${field}: ${issue.msg}` : issue.msg];
        }).join("; ")
      : "";
    const detail = typeof body?.detail === "string"
      ? body.detail
      : validation || "The request couldn't be completed. Please try again.";
    throw new Error(detail);
  }

  return response.status === 204 ? undefined as T : response.json() as Promise<T>;
}
