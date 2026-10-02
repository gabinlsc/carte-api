export class ApiClient {
  constructor(onRequest) {
    this.onRequest = onRequest;
    this.key = '';
    this.csrf = '';
  }
  async request(path, { method = 'GET', body, signal } = {}) {
    const headers = { Accept: 'application/json' };
    if (this.key) headers.Authorization = `Bearer ${this.key}`;
    if (this.csrf && method !== 'GET') headers['X-CSRF-Token'] = this.csrf;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const start = performance.now();
    let response;
    let payload;
    try {
      response = await fetch(path, {
        method,
        headers,
        credentials: 'same-origin',
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        ...(signal ? { signal } : {}),
      });
      payload = response.status === 204 ? null : await response.json();
    } catch (error) {
      if (error.name === 'AbortError') throw error;
      this.onRequest({
        path,
        method,
        status: response?.status ?? 0,
        latency: performance.now() - start,
        request:
          method === 'POST' && path.endsWith('/login')
            ? { redacted: true }
            : (body ?? null),
        response: { error: 'Réponse non JSON ou connexion interrompue' },
        time: new Date(),
      });
      throw new Error('Connexion impossible ou réponse non JSON');
    }
    this.onRequest({
      path,
      method,
      status: response.status,
      latency: performance.now() - start,
      request: path.endsWith('/login') ? { redacted: true } : (body ?? null),
      response:
        path.endsWith('/login') || path.endsWith('/session')
          ? {
              data: { authenticated: response.ok },
              ...(payload?.error ? { error: payload.error } : {}),
            }
          : payload,
      time: new Date(),
    });
    if (!response.ok) {
      const error = new Error(
        payload?.error?.message ?? `HTTP ${response.status}`,
      );
      error.status = response.status;
      throw error;
    }
    return payload;
  }
}
