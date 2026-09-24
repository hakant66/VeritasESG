import type { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as dmaAssessmentSql from '../data/dmaAssessmentSql.ts';

function failure(res: Response, status: number, error: string, code = 'gri-assessment/error') {
  return res.status(status).json({ success: false, error, code });
}

export function registerGRIAssessmentRoutes(app: Express, options: { jwtSecret: string }) {
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }
    try {
      const decoded = jwt.verify(header.slice('Bearer '.length), options.jwtSecret) as any;
      (req as any).userId = decoded.uid || decoded.sub;
      (req as any).userRole = decoded.role || '';
      return next();
    } catch {
      return failure(res, 401, 'Invalid or expired token', 'auth/invalid-token');
    }
  };

  const onError = (res: Response, err: unknown) => {
    const message = err instanceof Error ? err.message : 'GRI assessment operation failed';
    failure(res, 500, message, 'gri-assessment/server-error');
  };

  /** Wrap an async handler so thrown errors are logged and mapped to a 500. */
  const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => {
    return (req: Request, res: Response) => {
      void fn(req, res).catch((err: unknown) => {
        console.error('[GRI-ASSESSMENT]', err);
        onError(res, err);
      });
    };
  };

  app.get('/api/dma/gri-assessment', requireAuth, handle((req, res) => dmaAssessmentSql.getAssessment('gri', req, res)));

  app.put('/api/dma/gri-assessment/score', requireAuth, handle((req, res) => dmaAssessmentSql.putAssessmentScore('gri', req, res)));

  app.post('/api/dma/gri-assessment/scores', requireAuth, handle((req, res) => dmaAssessmentSql.postAssessmentScores('gri', req, res)));
}
