import { INTERNAL_ERROR, RESERVED_ERROR_CODES, STANDARD_ERROR_MAP } from './constants';
import { ErrorResponse } from './types';

export function isReservedErrorCode(code: number): boolean {
  return RESERVED_ERROR_CODES.includes(code);
}

export function isValidErrorCode(code: number): boolean {
  return typeof code === 'number';
}

export function getError(type: string): ErrorResponse {
  if (!Object.keys(STANDARD_ERROR_MAP).includes(type)) {
    return STANDARD_ERROR_MAP[INTERNAL_ERROR];
  }
  return (STANDARD_ERROR_MAP as any)[type];
}

export function getErrorByCode(code: number): ErrorResponse {
  const match = Object.values(STANDARD_ERROR_MAP).find(e => e.code === code);
  if (!match) {
    return STANDARD_ERROR_MAP[INTERNAL_ERROR];
  }
  return match;
}
