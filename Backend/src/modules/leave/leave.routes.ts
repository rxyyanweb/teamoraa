import { Router } from 'express';
import { requireRole } from '../../middleware/security.js';
import {
  previewLeaveController,
  applyLeaveController,
  myLeaveController,
  leaveOverviewController,
  leaveDetailsController,
  leaveDecisionController,
  cancelLeaveController,
  leaveTypesController,
  leaveBalancesController,
} from './leave.controller.js';
export function leaveRoutes() {
  const router = Router();
  router.get('/types', leaveTypesController);
  router.get('/balances', requireRole('hr', 'employee'), leaveBalancesController);
  router.get('/preview', requireRole('hr', 'employee'), previewLeaveController);
  router.get('/me', requireRole('hr', 'employee'), myLeaveController);
  router.get('/overview', requireRole('admin', 'hr'), leaveOverviewController);
  router.post('/requests', requireRole('hr', 'employee'), applyLeaveController);
  router.get('/requests/:id', leaveDetailsController);
  router.post('/requests/:id/cancel', requireRole('hr', 'employee'), cancelLeaveController);
  router.post('/requests/:id/approve', requireRole('hr'), leaveDecisionController('approved'));
  router.post('/requests/:id/reject', requireRole('hr'), leaveDecisionController('rejected'));
  return router;
}
