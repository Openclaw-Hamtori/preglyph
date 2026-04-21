export const WRITE_PREVIEW_SIZE = 10;
export const MAX_RECORD_LENGTH = 100;
export const WRITE_MODAL_WARNING = 'Published Preglyphs are permanent and cannot be edited or deleted.';

export function clampComposeText(text = '') {
  return text.slice(0, MAX_RECORD_LENGTH);
}
