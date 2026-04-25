export const HORIZONTAL_INSCRIPTION_MODE = 'horizontal';
export const UJONGSEO_INSCRIPTION_MODE = 'ujongseo';

export const INSCRIPTION_MODE_LABELS = {
  [HORIZONTAL_INSCRIPTION_MODE]: 'Horizontal',
  [UJONGSEO_INSCRIPTION_MODE]: 'Ujongseo',
};

const INSCRIPTION_MODE_TO_CODE = {
  [HORIZONTAL_INSCRIPTION_MODE]: 0,
  [UJONGSEO_INSCRIPTION_MODE]: 1,
};

const CODE_TO_INSCRIPTION_MODE = {
  0: HORIZONTAL_INSCRIPTION_MODE,
  1: UJONGSEO_INSCRIPTION_MODE,
};

export function normalizeInscriptionMode(mode) {
  const normalized = String(mode || '').trim().toLowerCase();
  return INSCRIPTION_MODE_TO_CODE[normalized] === undefined
    ? HORIZONTAL_INSCRIPTION_MODE
    : normalized;
}

export function getInscriptionModeLabel(mode) {
  return INSCRIPTION_MODE_LABELS[normalizeInscriptionMode(mode)];
}

export function getInscriptionModeCode(mode) {
  return INSCRIPTION_MODE_TO_CODE[normalizeInscriptionMode(mode)];
}

export function getInscriptionModeFromCode(code) {
  return CODE_TO_INSCRIPTION_MODE[Number(code)] || HORIZONTAL_INSCRIPTION_MODE;
}

export function getInscriptionGridCells(text, { size, cells, mode = HORIZONTAL_INSCRIPTION_MODE } = {}) {
  const normalizedMode = normalizeInscriptionMode(mode);
  const sourceCells = Array.isArray(cells) ? cells.slice(0, size * size) : Array.from(String(text || '')).slice(0, size * size);
  const filledCells = [...sourceCells, ...Array(Math.max(size * size - sourceCells.length, 0)).fill(' ')];

  if (normalizedMode !== UJONGSEO_INSCRIPTION_MODE) {
    return filledCells;
  }

  const positioned = Array(size * size).fill(' ');
  filledCells.forEach((char, index) => {
    const row = index % size;
    const column = size - 1 - Math.floor(index / size);
    if (column < 0) {
      return;
    }
    positioned[row * size + column] = char;
  });
  return positioned;
}