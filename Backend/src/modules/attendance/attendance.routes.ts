import { Router } from 'express';
import { requireRole } from '../../middleware/security.js';
import {
  checkInController,
  checkOutController,
  myAttendanceController,
  employeeAttendanceController,
  attendanceBoardController,
} from './attendance.controller.js';
export function attendanceRoutes() {
  const router = Router();
  router.post('/check-in', requireRole('hr', 'employee'), checkInController);
  router.post('/check-out', requireRole('hr', 'employee'), checkOutController);
  router.get('/me', requireRole('hr', 'employee'), myAttendanceController);
  router.get('/board', requireRole('admin', 'hr'), attendanceBoardController);
  router.get('/employees/:id', requireRole('admin', 'hr'), employeeAttendanceController);
  return router;
}
