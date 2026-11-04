/**
 * Health check routes
 * Kubernetes liveness and readiness probes
 */

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();
const healthController = new HealthController();

/**
 * @route   GET /health
 * @desc    Liveness probe
 * @access  Public
 */
router.get('/', healthController.liveness);

/**
 * @route   GET /ready
 * @desc    Readiness probe
 * @access  Public
 */
router.get('/ready', healthController.readiness);

export default router;
