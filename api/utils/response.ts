import { Response } from 'express';

export function ok(res: Response, data: any, message?: string) {
  const payload: Record<string, any> = { success: true, data };
  if (message) payload.message = message;
  return res.json(payload);
}

export function fail(res: Response, status: number, error: string, extra?: Record<string, any>) {
  return res.status(status).json({ success: false, error, ...extra });
}
