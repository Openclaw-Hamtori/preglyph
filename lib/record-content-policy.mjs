const UTF8_ENCODER = new TextEncoder();

export const MAX_RECORD_LENGTH = 100;
export const MAX_RECORD_UTF8_BYTES = 400;

export function getUtf8ByteLength(content = '') {
  return UTF8_ENCODER.encode(String(content || '')).length;
}

export function getRecordContentValidationError(content = '') {
  const normalizedContent = String(content || '');

  if (!normalizedContent.trim()) {
    return 'Content is required.';
  }

  if (normalizedContent.length > MAX_RECORD_LENGTH) {
    return `Content must be ${MAX_RECORD_LENGTH} characters or less.`;
  }

  if (getUtf8ByteLength(normalizedContent) > MAX_RECORD_UTF8_BYTES) {
    return 'Content is too large to store onchain.';
  }

  return '';
}

export function isRecordContentValid(content = '') {
  return !getRecordContentValidationError(content);
}
