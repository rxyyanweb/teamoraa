import type { Request, Response } from 'express';
import { objectIdInput } from '../../utils/workforce-validation.js';
import { boardInput, personalAttendanceInput, emptyInput } from './attendance.validation.js';
import { checkIn, checkOut } from './attendance.service.js';
import { myAttendance, attendanceBoard } from './attendance-query.service.js';
export const checkInController = async (req: Request, res: Response) => {
  emptyInput.parse(req.body);
  res.status(201).json({ data: await checkIn(req.auth!) });
};
export const checkOutController = async (req: Request, res: Response) => {
  emptyInput.parse(req.body);
  res.json({ data: await checkOut(req.auth!) });
};
export const myAttendanceController = async (req: Request, res: Response) =>
  res.json({ data: await myAttendance(req.auth!, personalAttendanceInput.parse(req.query)) });
export const employeeAttendanceController = async (req: Request, res: Response) =>
  res.json({
    data: await myAttendance(
      req.auth!,
      personalAttendanceInput.parse(req.query),
      objectIdInput.parse(req.params.id),
    ),
  });
export const attendanceBoardController = async (req: Request, res: Response) =>
  res.json({ data: await attendanceBoard(req.auth!, boardInput.parse(req.query)) });
