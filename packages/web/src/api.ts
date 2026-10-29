import type {
  Activity,
  ApiErrKind,
  ApiResult,
  Item,
  Settings,
  SettingsPatch,
  SiblingsView,
  SyncStatus,
  View,
} from '@octotally/shared';
import { API_ROUTES } from '@octotally/shared';

export class ApiError extends Error {
  readonly kind: ApiErrKind;
  readonly status: number;
  constructor(message: string, kind: ApiErrKind, status: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

type Listener = (err: ApiError) => void;
const authListeners = new Set<Listener>();
/** Fires on every `auth` error so the shell can drop to the login page. */
export function onAuthError(listener: Listener): () => void {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

async function request<T extends object>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has('content-type'))
    headers.set('content-type', 'application/json');
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers, credentials: 'same-origin' });
  } catch (e) {
    throw new ApiError(`Network error: ${(e as Error).message}`, 'system', 0);
  }
  let body: ApiResult<T> | null = null;
  try {
    body = (await res.json()) as ApiResult<T>;
  } catch {
    body = null;
  }
  if (!body) {
    throw new ApiError(
      res.ok ? 'Empty response' : `HTTP ${res.status}`,
      res.status === 401 ? 'auth' : 'system',
      res.status,
    );
  }
  if (body.ok === false) {
    const kind: ApiErrKind = body.kind ?? (res.status === 401 ? 'auth' : 'system');
    const err = new ApiError(body.message || `HTTP ${res.status}`, kind, res.status);
    if (kind === 'auth') for (const l of authListeners) l(err);
    throw err;
  }
  return body as T;
}

const post = <T extends object>(path: string, data?: unknown) =>
  request<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) });
const put = <T extends object>(path: string, data: unknown) =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(data) });

export type ItemAction = 'mute' | 'done' | 'restore';

export const api = {
  items: (q: string) =>
    request<{ items: Item[]; total: number; query: string }>(
      `${API_ROUTES.items}?q=${encodeURIComponent(q)}`,
    ),
  item: (id: string) => request<{ item: Item; activity: Activity[] }>(API_ROUTES.item(id)),
  itemAction: (id: string, action: ItemAction) => post<{ item: Item }>(API_ROUTES[action](id)),
  bulkAction: (ids: string[], action: ItemAction) =>
    post<{ items: Item[]; missing: string[] }>(API_ROUTES.itemsBulk, { ids, action }),
  refresh: () => post<{ status?: SyncStatus }>(API_ROUTES.refresh),
  status: () => request<{ status: SyncStatus }>(API_ROUTES.status),
  views: () => request<{ views: View[] }>(API_ROUTES.views),
  createView: (name: string, query: string) => post<{ view: View }>(API_ROUTES.views, { name, query }),
  updateView: (id: string, patch: Partial<Pick<View, 'name' | 'query' | 'position'>>) =>
    put<{ view: View }>(API_ROUTES.view(id), patch),
  deleteView: (id: string) => request<object>(API_ROUTES.view(id), { method: 'DELETE' }),
  settings: () => request<{ settings: Settings }>(API_ROUTES.settings),
  patchSettings: (patch: SettingsPatch) => put<{ settings: Settings }>(API_ROUTES.settings, patch),
  repos: () => request<{ repos: { repo: string; count: number }[] }>(API_ROUTES.repos),
  siblings: () => request<{ siblings: SiblingsView | null }>(API_ROUTES.siblings),
  version: () => request<{ version: string }>('/api/version').then((r) => r.version),
  testNotifier: (name: string) => post<object>(API_ROUTES.testNotifier(name)),
  authStatus: () => request<{ authenticated: boolean; required: boolean }>('/auth/status'),
  login: (password: string) => post<object>('/auth/login', { password }),
  logout: () => post<object>('/auth/logout'),
};
