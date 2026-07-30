import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as preferences from '../controllers/preferences.controller.js';

export const preferencesRouter = Router();

preferencesRouter.use(requireAuth);
preferencesRouter.get('/', preferences.getPreferences);
preferencesRouter.patch('/', preferences.patchPreferences);
