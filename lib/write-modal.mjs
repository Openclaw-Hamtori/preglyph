import { MAX_RECORD_LENGTH } from './record-content-policy.mjs';

export { MAX_RECORD_LENGTH };
export const WRITE_PREVIEW_SIZE = 10;
export const WRITE_MODAL_WARNING = 'Published Preglyphs are permanent and cannot be edited or deleted.';

export function clampComposeText(text = '') {
  return text.slice(0, MAX_RECORD_LENGTH);
}
