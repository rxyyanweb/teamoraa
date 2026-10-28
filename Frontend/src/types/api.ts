export type Role = 'admin' | 'hr' | 'employee';
export interface User {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  active: boolean;
  department: string;
  designation: string;
  employeeCode: string;
  phone: string;
  address: string;
  joinedAt: string;
}
export interface Company {
  _id: string;
  name: string;
  address: string;
  timezone: string;
  officeStart: string;
  officeEnd: string;
  graceMinutes: number;
  halfDayHours: number;
  weekend: number[];
  officeLatitude: number | null;
  officeLongitude: number | null;
  officeRadius: number;
  departments: string[];
  designations: string[];
}
export interface Directory {
  users: User[];
  page: number;
  pageSize: number;
  total: number;
}
export interface Dashboard {
  company: Pick<Company, 'name' | 'timezone' | 'officeStart' | 'officeEnd'>;
  statistics?: {
    totalEmployees: number;
    activeEmployees: number;
    departments: number;
    hrAccounts?: number;
  };
  recentEmployees?: User[];
  user?: User;
}

export interface NotificationItem {
  _id: string;
  companyId: string;
  recipientId: string;
  title: string;
  message: string;
  type: 'leave_approved' | 'leave_rejected' | 'payslip_available' | 'announcement' | 'system';
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AnnouncementItem {
  _id: string;
  companyId: string;
  authorId: { _id: string; name: string; role: Role } | string;
  title: string;
  content: string;
  priority: 'normal' | 'urgent';
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
  isRefusal?: boolean;
  timestamp?: string;
}

export interface SmartLeaveDraft {
  leaveTypeCode: string;
  startDate: string;
  endDate: string;
  reason: string;
  workingDays: number;
  quotaAvailable: number | null;
  quotaRemainingAfter: number | null;
  warnings: string[];
}

export interface AuditLogItem {
  _id: string;
  companyId: string;
  actorId: { _id: string; name: string; email: string; role: Role } | string | null;
  actorRole: Role;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
