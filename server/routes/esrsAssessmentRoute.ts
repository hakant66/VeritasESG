import type { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as dmaAssessmentSql from '../data/dmaAssessmentSql.ts';

function failure(res: Response, status: number, error: string, code = 'esrs-assessment/error') {
  return res.status(status).json({ success: false, error, code });
}

export function registerESRSAssessmentRoutes(app: Express, options: { jwtSecret: string }) {
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
    const message = err instanceof Error ? err.message : 'ESRS assessment operation failed';
    failure(res, 500, message, 'esrs-assessment/server-error');
  };

  /** Wrap an async handler so thrown errors are logged and mapped to a 500. */
  const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => {
    return (req: Request, res: Response) => {
      void fn(req, res).catch((err: unknown) => {
        console.error('[ESRS-ASSESSMENT]', err);
        onError(res, err);
      });
    };
  };

  app.get('/api/dma/esrs-assessment', requireAuth, handle((req, res) => dmaAssessmentSql.getAssessment('esrs', req, res)));

  app.put('/api/dma/esrs-assessment/score', requireAuth, handle((req, res) => dmaAssessmentSql.putAssessmentScore('esrs', req, res)));

  app.post('/api/dma/esrs-assessment/scores', requireAuth, handle((req, res) => dmaAssessmentSql.postAssessmentScores('esrs', req, res)));
}
