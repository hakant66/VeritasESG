import type { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as griMaterialitySql from '../data/griMaterialitySql.ts';

function failure(res: Response, status: number, error: string, code = 'gri-materiality/error') {
  return res.status(status).json({ success: false, error, code });
}

export function registerGRIMaterialityRoutes(app: Express, options: { jwtSecret: string }) {
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
    const message = err instanceof Error ? err.message : 'GRI materiality operation failed';
    failure(res, 500, message, 'gri-materiality/server-error');
  };

  /** Wrap an async handler so thrown errors are logged and mapped to a 500. */
  const handle = (fn: (req: Request, res: Response) => Promise<unknown>) => {
    return (req: Request, res: Response) => {
      void fn(req, res).catch((err: unknown) => {
        console.error('[GRI-MATERIALITY]', err);
        onError(res, err);
      });
    };
  };

  app.get('/api/gri-materiality', requireAuth, handle((req, res) => griMaterialitySql.listRows(req, res)));

  app.post('/api/gri-materiality', requireAuth, handle((req, res) => griMaterialitySql.createRow(req, res)));

  app.put('/api/gri-materiality/:id', requireAuth, handle((req, res) => griMaterialitySql.updateRow(req, res)));

  app.delete('/api/gri-materiality/:id', requireAuth, handle((req, res) => griMaterialitySql.deleteRow(req, res)));

  app.post('/api/gri-materiality/reorder', requireAuth, handle((req, res) => griMaterialitySql.reorderRows(req, res)));

  app.post('/api/gri-materiality/import', requireAuth, handle((req, res) => griMaterialitySql.importRows(req, res)));
}
