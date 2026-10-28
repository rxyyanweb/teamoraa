import { Company } from '../modules/organization/company.model.js';
import { LeavePolicy } from '../modules/organization/leave-policy.model.js';
import { User } from '../modules/users/user.model.js';
import { Audit } from '../modules/audit/audit.model.js';
import { Attendance } from '../modules/attendance/attendance.model.js';
import { Correction } from '../modules/attendance-corrections/correction.model.js';
import { Leave } from '../modules/leave/leave.model.js';
import { PayrollRun } from '../modules/payroll/payroll.model.js';
import { Announcement } from '../modules/announcements/announcement.model.js';
import { Notification } from '../modules/notifications/notification.model.js';
import { AiLog } from '../modules/ai/ai-log.model.js';

export async function ensureModelIndexes() {
  await Promise.all(
    [Company, LeavePolicy, User, Audit, Attendance, Correction, Leave, PayrollRun, Announcement, Notification, AiLog].map(
      (model) => model.createIndexes(),
    ),
  );
}
