import type { Express, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as emissionsSql from '../data/emissionsSql.ts';

export { metricToFactorCategory } from '../lib/emissionMetricMapping.ts';

function failure(res: Response, status: number, error: string, code = 'emissions/error') {
  return res.status(status).json({ success: false, error, code });
}

export function registerEmissionsRoutes(app: Express, options: { jwtSecret: string }) {
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return failure(res, 401, 'Authentication required', 'auth/missing-token');
    }
    try {
      const decoded = jwt.verify(header.slice('Bearer '.length), options.jwtSecret) as any;
      (req as any).userId = decoded.uid || decoded.sub;
      return next();
    } catch {
      return failure(res, 401, 'Invalid or expired token', 'auth/invalid-token');
    }
  };

  const onError = (res: Response, err: unknown) => {
    const message = err instanceof Error ? err.message : 'Emissions operation failed';
    failure(res, 500, message, 'emissions/server-error');
  };

  /** Runs an async handler, funnelling unexpected failures into a 500 response. */
  const run = (res: Response, handler: () => Promise<unknown>): void => {
    void (async () => {
      try {
        await handler();
      } catch (err: unknown) {
        console.error('[EMISSIONS]', err);
        onError(res, err);
      }
    })();
  };

  /** All active factors, grouped by scope. */
  app.get('/api/emissions/factors', requireAuth, (req, res) => {
    run(res, () => emissionsSql.getFactors(req, res));
  });

  /** Per-customer, per-year totals plus the underlying entries. */
  app.get('/api/emissions/summary', requireAuth, (req, res) => {
    run(res, () => emissionsSql.getSummary(req, res));
  });

  /** Calculate and persist a single emission entry from an activity value. */
  app.post('/api/emissions/calculate', requireAuth, (req, res) => {
    run(res, () => emissionsSql.postCalculate(req, res));
  });

  /** Read intensity denominators for a customer/year. */
  app.get('/api/emissions/intensity', requireAuth, (req, res) => {
    run(res, () => emissionsSql.getIntensity(req, res));
  });

  /** Upsert intensity denominators for a customer/year. */
  app.put('/api/emissions/intensity', requireAuth, (req, res) => {
    run(res, () => emissionsSql.putIntensity(req, res));
  });

  /** Read market-based Scope 2 inputs for a customer/year. */
  app.get('/api/emissions/scope2-market', requireAuth, (req, res) => {
    run(res, () => emissionsSql.getScope2Market(req, res));
  });

  /** Upsert market-based Scope 2 inputs for a customer/year. */
  app.put('/api/emissions/scope2-market', requireAuth, (req, res) => {
    run(res, () => emissionsSql.putScope2Market(req, res));
  });

  /** Scope 1 + 2 totals across multiple years (for trend charts). */
  app.get('/api/emissions/yearly-totals', requireAuth, (req, res) => {
    run(res, () => emissionsSql.getYearlyTotals(req, res));
  });

  /** All metric definitions grouped by scope (for the data-entry grid). */
  app.get('/api/emissions/metric-definitions', requireAuth, (req, res) => {
    run(res, () => emissionsSql.getMetricDefinitions(req, res));
  });

  /** Metric entries for a customer/year, each enriched with its definition. */
  app.get('/api/emissions/metric-entries', requireAuth, (req, res) => {
    run(res, () => emissionsSql.getMetricEntries(req, res));
  });

  /** Upsert a metric entry keyed by customer/year/code/facility. */
  app.post('/api/emissions/metric-entries', requireAuth, (req, res) => {
    run(res, () => emissionsSql.postMetricEntries(req, res));
  });

  /** Advance (or revert) a metric entry's approval stage; auto-calc on APPROVED. */
  app.patch('/api/emissions/metric-entries/:id/stage', requireAuth, (req, res) => {
    run(res, () => emissionsSql.patchMetricEntryStage(req, res, options.jwtSecret));
  });
}
