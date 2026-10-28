import { Router } from 'express';
import { requireRole } from '../../middleware/security.js';
import {
  getAdminAnalytics,
  getHrAnalytics,
  getEmployeePersonalAnalytics,
} from './analytics.service.js';

export function analyticsRoutes() {
  const router = Router();

  // Admin Analytics Dashboard
  router.get('/admin', requireRole('admin'), async (req, res) => {
    const data = await getAdminAnalytics(req.auth!.companyId);
    res.json({ data });
  });

  // HR Analytics Dashboard
  router.get('/hr', requireRole('admin', 'hr'), async (req, res) => {
    const data = await getHrAnalytics(req.auth!.companyId);
    res.json({ data });
  });

  // Employee Personal Analytics Dashboard
  router.get('/employee', requireRole('employee'), async (req, res) => {
    const data = await getEmployeePersonalAnalytics(req.auth!.companyId, req.auth!.id);
    res.json({ data });
  });

  return router;
}
