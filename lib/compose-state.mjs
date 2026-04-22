export function shouldShowComposeBanner(composeState = {}) {
  return Boolean(composeState?.message) && composeState?.loading !== true;
}

export function getComposeLoadingHeadline() {
  return 'Recording Preglyph';
}

export function isUserRejectedComposeError(error = {}) {
  const code = String(error?.code || '').trim();
  const message = [error?.reason, error?.shortMessage, error?.message]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (code === '4001' || code === 'ACTION_REJECTED') {
    return true;
  }

  return [
    'user rejected',
    'user denied',
    'rejected the request',
    'rejected action',
    'denied transaction signature',
  ].some((fragment) => message.includes(fragment));
}
