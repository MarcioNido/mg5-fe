import { ApiError, apiErrorFromResponse } from './error';
import {
  beginTenantRequest,
  isCurrentTenantGeneration,
} from './request-generation';

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  tenantSlug?: string;
  tenantAware?: boolean;
};

export const UNAUTHORIZED_EVENT = 'mg5:unauthorized';

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, tenantSlug, tenantAware = false, headers: initialHeaders, ...init } = options;

  if (tenantAware && !tenantSlug) {
    throw new ApiError(400, 'Choose a financial profile before loading this data.');
  }

  const tenantRequest = tenantAware ? beginTenantRequest(options.signal ?? undefined) : null;
  const headers = new Headers(initialHeaders);
  headers.set('Accept', 'application/json');
  if (tenantSlug) headers.set('X-Tenant-Slug', tenantSlug);

  let serializedBody: BodyInit | undefined;
  if (body instanceof FormData) {
    serializedBody = body;
  } else if (body !== undefined) {
    headers.set('Content-Type', 'application/json');
    serializedBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(`/api/${path.replace(/^\//, '')}`, {
      ...init,
      body: serializedBody,
      headers,
      credentials: 'same-origin',
      signal: tenantRequest?.signal ?? options.signal,
    });

    if (!response.ok) {
      const error = await apiErrorFromResponse(response);
      if (error.status === 401 && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      }
      throw error;
    }

    if (tenantRequest && !isCurrentTenantGeneration(tenantRequest.generation)) {
      throw new DOMException('The financial profile changed.', 'AbortError');
    }

    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as T;
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!contentType.includes('application/json') && !contentType.includes('+json')) {
      return undefined as T;
    }

    return await response.json() as T;
  } finally {
    tenantRequest?.finish();
  }
}
