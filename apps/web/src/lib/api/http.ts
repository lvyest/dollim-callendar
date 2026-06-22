/**
 * orval 커스텀 mutator (axios 스타일 config 를 받아 fetch 로 호출, 데이터를 직접 반환).
 * 같은 오리진의 Next Route Handler(/api/*)를 호출하며 세션 쿠키를 함께 보낸다.
 */
export type RequestConfig = {
  url: string;
  method: string;
  params?: Record<string, unknown>;
  data?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

const API_BASE = '/api';

export async function customFetch<T>(config: RequestConfig): Promise<T> {
  const query = config.params
    ? `?${new URLSearchParams(
        Object.entries(config.params)
          .filter(([, v]) => v != null)
          .map(([k, v]) => [k, String(v)]),
      ).toString()}`
    : '';

  const res = await fetch(`${API_BASE}${config.url}${query}`, {
    method: config.method.toUpperCase(),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...config.headers },
    body: config.data != null ? JSON.stringify(config.data) : undefined,
    signal: config.signal,
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : undefined;
  if (!res.ok) throw body ?? new Error(`${res.status} ${res.statusText}`);
  return body as T;
}

export default customFetch;
