import { t } from '../i18n';
export class FrameApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly retryAfter: string | null;

  constructor(
    message: string,
    status: number | null,
    code: string | null = null,
    retryAfter: string | null = null,
  ) {
    super(message);
    this.name = 'FrameApiError';
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export const SIGN_IN_UNAVAILABLE = t('Sign-in isn’t available yet.');
export const SESSION_ENDED = t('Your Frame session ended. Sign in again.');
export const NETWORK_ERROR = t('Couldn’t reach frameprivacy.com.');

/**
 * Reuse of a rotated refresh token (invalid_grant) or a dead token (invalid_token,
 * or a 401 that is not invalid_client). The connection is gone.
 */
export function endsSession(error: FrameApiError): boolean {
  if (error.code === 'invalid_client') return false;
  if (error.code === 'invalid_grant' || error.code === 'invalid_token') return true;
  return error.status === 401;
}

export function messageForApiError(status: number, code: string | null, retryAfter: string | null): string {
  if (status === 503) return SIGN_IN_UNAVAILABLE;
  if (status === 429) return busyMessage(retryAfter);
  if (code === 'invalid_grant') return t('That sign-in expired. Try again.');
  if (code === 'invalid_token') return SESSION_ENDED;
  if (code === 'invalid_client') return t('This extension isn’t allowed to sign in yet.');
  if (code === 'insufficient_scope') return t('Frame did not grant access to that.');
  if (status === 403) return t('Frame refused this sign-in from this browser.');
  if (status === 401) return SESSION_ENDED;
  return t('Frame couldn’t complete that request.');
}

function busyMessage(retryAfter: string | null): string {
  const seconds = retryAfter && /^\d+$/.test(retryAfter.trim()) ? Number(retryAfter.trim()) : null;
  if (seconds && seconds > 0 && seconds <= 120) return t('Frame is busy. Try again in {n} seconds.', { n: seconds });
  return t('Frame is busy. Try again shortly.');
}
