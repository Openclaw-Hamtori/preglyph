export function shouldShowComposeBanner(composeState = {}) {
  return Boolean(composeState?.message) && composeState?.loading !== true;
}

export function getComposeLoadingHeadline() {
  return 'Recording Preglyph';
}
