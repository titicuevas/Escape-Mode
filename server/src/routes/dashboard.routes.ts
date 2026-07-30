import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

export const dashboardRouter = Router();

dashboardRouter.use(requireAuth);
dashboardRouter.get('/', dashboardController.dashboard);
