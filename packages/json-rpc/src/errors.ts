import { ErrorResponse } from './types';

export enum StandardErrorCodes {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,
  ServerError = -32000,
}

const ERROR_MESSAGE_MAP = {
  [StandardErrorCodes.ParseError]: 'Parse error',
  [StandardErrorCodes.InvalidRequest]: 'Invalid Request',
  [StandardErrorCodes.MethodNotFound]: 'Method not found',
  [StandardErrorCodes.InvalidParams]: 'Invalid params',
  [StandardErrorCodes.InternalError]: 'Internal error',
  [StandardErrorCodes.ServerError]: 'Server error',
};

export const SERVER_ERROR_CODE_RANGE = [-32099, -32000];

export function isValidErrorCode(code: number): boolean {
  return typeof code === 'number';
}

export function isStandardErrorCode(code: number): code is StandardErrorCodes {
  return Object.values(StandardErrorCodes).includes(code);
}

export function isServerErrorCode(code: number): boolean {
  return code >= SERVER_ERROR_CODE_RANGE[0] && code <= SERVER_ERROR_CODE_RANGE[1];
}

export function getStandardError(code: number): ErrorResponse {
  const finalCode = isStandardErrorCode(code) ? code : StandardErrorCodes.InternalError;
  return {
    code: finalCode,
    message: ERROR_MESSAGE_MAP[finalCode],
  };
}
