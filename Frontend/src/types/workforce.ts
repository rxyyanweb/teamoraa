export interface Person {
  id: string;
  name: string;
  department: string;
  employeeCode: string;
  role?: string;
}
export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
export interface Attendance {
  id: string;
  date: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  workedMinutes: number;
  isLate: boolean;
  isHalfDay: boolean;
  status: string;
  shiftState: string;
  timezone: string;
  corrected: boolean;
  scheduled: boolean;
}
export interface AttendanceDay {
  date: string;
  status: string;
  attendance: Attendance | null;
  leaveType: string | null;
}
export interface PersonalAttendance extends Page<Attendance> {
  month: string;
  today: string;
  timezone: string;
  now: string;
  officeStart: string;
  officeEnd: string;
  employee: Person;
  todayAttendance: Attendance | null;
  activeShift: Attendance | null;
  calendar: AttendanceDay[];
  summary: {
    workedMinutes: number;
    late: number;
    halfDays: number;
    missingCheckouts: number;
    absent: number;
    onLeave: number;
    attendedDays: number;
  };
}
export interface AttendanceBoard extends Page<{
  employee: Person;
  attendance: Attendance | null;
  status: string;
  leaveType: string | null;
}> {
  date: string;
  today: string;
  timezone: string;
  now: string;
  departments: string[];
  summary: {
    headcount: number;
    present: number;
    late: number;
    halfDay: number;
    onLeave: number;
    absent: number;
    missingCheckout: number;
    notCheckedIn: number;
  };
}
export interface LeaveType {
  code: string;
  name: string;
  annualQuota: number | null;
  active: boolean;
}
export interface Balance extends LeaveType {
  year: number;
  used: number;
  pending: number;
  available: number | null;
}
export interface LeaveRequest {
  id: string;
  employeeId: string;
  employee: Person | null;
  type: string;
  typeName: string;
  startDate: string;
  endDate: string;
  workingDates: string[];
  workingDays: number;
  status: string;
  reason: string;
  decisionComment: string;
  reviewer: string | null;
  reviewedAt: string | null;
  createdAt: string;
  canDecide: boolean;
  canCancel: boolean;
}
export interface PersonalLeave extends Page<LeaveRequest> {
  month: string;
  year: number;
  today: string;
  timezone: string;
  balances: Balance[];
  types: LeaveType[];
  calendar: { date: string; requestId: string; typeName: string; status: string }[];
}
export interface LeaveOverview extends Page<LeaveRequest> {
  year: number;
  timezone: string;
  departments: string[];
  summary: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
    approvedDays: number;
  };
  departmentUsage: { department: string; approvedDays: number; pending: number }[];
}
export interface Correction {
  id: string;
  date: string;
  reason: string;
  status: string;
  timezone: string;
  employee: Person;
  original: { checkedInAt: string | null; checkedOutAt: string | null };
  requested: {
    checkedInAt: string;
    checkedOutAt: string;
    workedMinutes: number;
    isLate: boolean;
    isHalfDay: boolean;
  };
  decisionComment: string;
  reviewer: string | null;
  canDecide: boolean;
}
export interface LeavePolicy {
  types: LeaveType[];
  holidays: { date: string; name: string }[];
}
