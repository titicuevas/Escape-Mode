import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { gamesRouter } from './routes/games.routes.js';
import { dashboardRouter } from './routes/dashboard.routes.js';
import {
  budgetRouter,
  offersRouter,
  paymentsRouter,
} from './routes/finance.routes.js';
import { rawgRouter, discoveryRouter } from './routes/rawg.routes.js';
import { preferencesRouter } from './routes/preferences.routes.js';
import { listsRouter } from './routes/lists.routes.js';
import { exportRouter } from './routes/export.routes.js';
import { errorHandler } from './middleware/error-handler.js';
import type { Env } from './config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(env: Env) {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy:
        env.NODE_ENV === 'production'
          ? {
              useDefaults: true,
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
                mediaSrc: ["'self'", 'https:', 'blob:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
                workerSrc: ["'self'", 'blob:'],
                manifestSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: [],
              },
            }
          : false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.NODE_ENV === 'production' ? 500 : 2000,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Demasiadas peticiones. Inténtalo más tarde.' },
    }),
  );

  app.use(express.json({ limit: '5mb' }));
  app.use(cookieParser());

  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/games', gamesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/offers', offersRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/budget', budgetRouter);
  app.use('/api/rawg', rawgRouter);
  app.use('/api/discovery', discoveryRouter);
  app.use('/api/preferences', preferencesRouter);
  app.use('/api/lists', listsRouter);
  app.use('/api/export', exportRouter);

  if (env.NODE_ENV === 'production') {
    const clientDist = path.resolve(__dirname, '../../client/dist');
    app.use(
      express.static(clientDist, {
        index: false,
        setHeaders(res, filePath) {
          const base = path.basename(filePath);
          if (
            base === 'index.html' ||
            base === 'sw.js' ||
            base === 'registerSW.js' ||
            base === 'offline.html' ||
            base.startsWith('workbox-') ||
            base.endsWith('.webmanifest')
          ) {
            res.setHeader('Cache-Control', 'no-cache');
          } else {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(clientDist, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(errorHandler);

  return app;
}
