export const apiFetch = async (path: string, init?: RequestInit): Promise<Response> => {
  return fetch(path, {
    ...init,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body && !(init.body instanceof FormData)
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...init?.headers,
    },
  });
};

export const readJson = async <T>(res: Response): Promise<T> => {
  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
};

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super(`API ${status}`);
    this.status = status;
    this.body = body;
  }
}

export const expectJson = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = await readJson<unknown>(res).catch(() => undefined);
    throw new ApiError(res.status, body);
  }
  return readJson<T>(res);
};
