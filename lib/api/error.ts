import type { ApiErrorBody, LaravelValidationErrors } from './types';

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have access to this financial profile.',
  404: 'The requested resource was not found.',
  409: 'This change conflicts with a newer version of the data.',
  422: 'Please review the highlighted fields.',
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly validationErrors?: LaravelValidationErrors,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  let body: ApiErrorBody = {};

  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    // Non-JSON failures use the status-specific fallback below.
  }

  const firstValidationMessage = body.errors && Object.values(body.errors)[0]?.[0];
  const message = firstValidationMessage ?? body.message ?? STATUS_MESSAGES[response.status]
    ?? 'Something went wrong while contacting Money Guru.';

  return new ApiError(response.status, message, body.errors);
}
