import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';
export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res,
  _next,
) => {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Erreur interne';
  let details: unknown;
  if (error instanceof AppError) {
    status = error.status;
    code = error.code;
    message = error.message;
  } else if (error instanceof ZodError) {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = 'Données invalides';
    details = error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
  } else if (typeof error === 'object' && error !== null && 'type' in error) {
    if (error.type === 'entity.too.large') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'Payload trop volumineux';
    } else if (error.type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'JSON invalide';
    }
  }
  if (status === 500)
    console.error(
      JSON.stringify({ level: 'error', requestId: res.locals.requestId, code }),
    );
  res
    .status(status)
    .json({
      error: {
        code,
        message,
        ...(details ? { details } : {}),
        requestId: res.locals.requestId,
      },
    });
};
