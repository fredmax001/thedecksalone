import { Request, Response, NextFunction } from 'express';

export type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>;

/**
 * Wrap an async Express route handler so that unexpected errors are caught
 * and returned as a standardized 500 response.
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(fn: AsyncRequestHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      console.error('Internal server error:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    });
  };
}
