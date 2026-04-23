export const MAX_RECORD_LENGTH = 100;

export function getRecordContentValidationError(content = '') {
  const normalizedContent = String(content || '');

  if (!normalizedContent.trim()) {
    return 'Content is required.';
  }

  if (normalizedContent.length > MAX_RECORD_LENGTH) {
    return `Content must be ${MAX_RECORD_LENGTH} characters or less.`;
  }

  return '';
}

export function isRecordContentValid(content = '') {
  return !getRecordContentValidationError(content);
}
