import { ApiError } from './error';

export function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === 'AbortError'
    || reason instanceof Error && reason.name === 'AbortError';
}

export function messageFromError(reason: unknown, fallback: string) {
  if (reason instanceof ApiError) return reason.message;
  return fallback;
}
