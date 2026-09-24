import type { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as materialitySql from '../data/materialitySql.ts';
import { ESRS_TOPICS } from '../lib/domainEnums.ts';

function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ success: true, data });
}

function failure(res: Response, status: number, error: string, code = 'materiality/error') {
  return res.status(status).json({ success: false, error, code });
}

export function registerMaterialityRoutes(app: Express, options: { jwtSecret: string }) {
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
    const message = err instanceof Error ? err.message : 'Materiality operation failed';
    failure(res, 500, message, 'materiality/server-error');
  };

  /** Wrap an async handler so thrown errors are logged and mapped to a 500. */
  const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => {
    return (req: Request, res: Response) => {
      void fn(req, res).catch((err: unknown) => {
        console.error('[MATERIALITY]', err);
        onError(res, err);
      });
    };
  };

  /** Static ESRS topic catalogue. No auth required. */
  app.get('/api/materiality/topics-definition', (req, res) => {
    success(res, ESRS_TOPICS);
  });

  /** Assessment + scores for a customer/year, merged with the full topic list. */
  app.get('/api/materiality', requireAuth, handle((req, res) => materialitySql.getMateriality(req, res)));

  /** Upsert a single topic score; recomputes materiality + assessment list. */
  app.put('/api/materiality/score', requireAuth, handle((req, res) => materialitySql.putMaterialityScore(req, res)));

  /** Lock the assessment as APPROVED. Elevated roles only. */
  app.post('/api/materiality/approve', requireAuth, handle((req, res) => materialitySql.postMaterialityApprove(req, res)));

  /** Fast lookup used by downstream modules to gate behaviour. */
  app.get('/api/materiality/config', requireAuth, handle((req, res) => materialitySql.getMaterialityConfig(req, res)));
}
