import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../utils/logger';

export const validateRequest = (schema: ZodSchema<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn('Validation error:', { path: req.path, errors: (error as any).errors });
        return res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: (error as any).errors,
        });
      }
      return next(error);
    }
  };
};
