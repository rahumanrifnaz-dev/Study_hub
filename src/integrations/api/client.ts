const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const apiClient = {
  async get<T>(path: string, token?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return res.json();
  },
  async post<T>(path: string, body: unknown, token?: string): Promise<T> {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return res.json();
  },
};
