import { User } from '../../users/user.model.js';
import { Attendance } from '../../attendance/attendance.model.js';
import { Leave } from '../../leave/leave.model.js';
import { Company } from '../../organization/company.model.js';
import { PayrollRun } from '../../payroll/payroll.model.js';
import { leaveBalances } from '../../leave/leave-balance.service.js';
import { getAdminAnalytics, getHrAnalytics } from '../../analytics/analytics.service.js';
import { localDate } from '../../../utils/company-date.js';
import type { AuthenticatedUser } from '../../../types/auth.js';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'OBJECT';
    properties: Record<string, { type: 'STRING' | 'NUMBER' | 'BOOLEAN'; description: string }>;
    required?: string[];
  };
}

export const AI_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'get_headcount',
    description: 'Get company headcount metrics, total and active employee counts, optionally filtered by department. (Admin and HR only)',
    parameters: {
      type: 'OBJECT',
      properties: {
        department: { type: 'STRING', description: 'Optional department name filter (e.g. Engineering, HR)' },
      },
    },
  },
  {
    name: 'get_attendance_summary',
    description: "Get today's or a specific date's attendance summary. For employee, returns their own check-in/out. For HR/Admin, returns company present/late/half-day counts.",
    parameters: {
      type: 'OBJECT',
      properties: {
        date: { type: 'STRING', description: 'Date in YYYY-MM-DD format (defaults to current date if omitted)' },
      },
    },
  },
  {
    name: 'get_late_comers',
    description: 'Get employees who arrived late most frequently in the current or specified month. (Admin and HR only)',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: { type: 'STRING', description: 'Month in YYYY-MM format' },
      },
    },
  },
  {
    name: 'get_leave_summary',
    description: 'Get overview of leaves, count of employees on leave today, and pending leave approval counts. (Admin and HR only)',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', description: 'Optional filter: pending, approved, or all' },
      },
    },
  },
  {
    name: 'get_my_leave_balance',
    description: 'Get the remaining leave quotas (Annual, Sick, Casual, Unpaid) for the currently authenticated user.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_payroll_summary',
    description: 'Get monthly payroll cost and disbursement totals. For employees, strictly returns only their own finalized payslip amount.',
    parameters: {
      type: 'OBJECT',
      properties: {
        month: { type: 'STRING', description: 'Month in YYYY-MM format (e.g. 2026-10)' },
      },
    },
  },
  {
    name: 'search_employees',
    description: 'Search employees by name, employee code, or department. (Admin and HR only)',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Search term (employee name, code, or department)' },
      },
      required: ['query'],
    },
  },
];

export async function executeAiTool(
  toolName: string,
  args: Record<string, any>,
  actor: AuthenticatedUser,
): Promise<{ result: any; error?: string }> {
  const company = await Company.findById(actor.companyId);
  const timezone = company?.timezone || 'Asia/Karachi';
  const todayStr = localDate(new Date(), timezone);

  switch (toolName) {
    case 'get_headcount': {
      if (actor.role === 'employee') {
        return { result: null, error: 'Unauthorized: Employees cannot access company headcount metrics.' };
      }
      const filter: Record<string, any> = { companyId: actor.companyId, role: 'employee' };
      if (args.department) filter.department = new RegExp(args.department, 'i');

      const total = await User.countDocuments(filter);
      const active = await User.countDocuments({ ...filter, active: true });
      return {
        result: {
          department: args.department || 'All Departments',
          totalEmployees: total,
          activeEmployees: active,
          inactiveEmployees: total - active,
        },
      };
    }

    case 'get_attendance_summary': {
      const date = args.date || todayStr;
      if (actor.role === 'employee') {
        const att = await Attendance.findOne({
          companyId: actor.companyId,
          employeeId: actor.id,
          date,
        });
        return {
          result: att
            ? {
                date: att.date,
                status: att.isHalfDay ? 'half_day' : att.isLate ? 'late' : 'present',
                isLate: att.isLate,
                isHalfDay: att.isHalfDay,
                checkedInAt: att.checkedInAt,
                checkedOutAt: att.checkedOutAt,
                workedHours: Math.round((att.workedMinutes / 60) * 10) / 10,
              }
            : { date, status: 'no_record', message: 'No check-in record found for this date.' },
        };
      }

      // HR & Admin
      const attendances = await Attendance.find({ companyId: actor.companyId, date });
      const present = attendances.filter((a) => !a.isHalfDay).length;
      const late = attendances.filter((a) => a.isLate).length;
      const halfDay = attendances.filter((a) => a.isHalfDay).length;
      const onLeave = await Leave.countDocuments({
        companyId: actor.companyId,
        status: 'approved',
        startDate: { $lte: date },
        endDate: { $gte: date },
      });

      return {
        result: {
          date,
          totalCheckedIn: attendances.length,
          present,
          late,
          halfDay,
          onLeaveToday: onLeave,
        },
      };
    }

    case 'get_late_comers': {
      if (actor.role === 'employee') {
        return { result: null, error: 'Unauthorized: Employees cannot view colleagues’ late arrival rankings.' };
      }
      const monthPrefix = args.month || todayStr.slice(0, 7);
      const topLates = await Attendance.aggregate([
        {
          $match: {
            companyId: company!._id,
            isLate: true,
            date: { $regex: `^${monthPrefix}` },
          },
        },
        { $group: { _id: '$employeeId', lateCount: { $sum: 1 } } },
        { $sort: { lateCount: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            name: '$user.name',
            employeeCode: '$user.employeeCode',
            department: '$user.department',
            lateCount: 1,
            _id: 0,
          },
        },
      ]);
      return { result: { month: monthPrefix, topLateComers: topLates } };
    }

    case 'get_leave_summary': {
      if (actor.role === 'employee') {
        return { result: null, error: 'Unauthorized: Employees cannot view company-wide leave summaries.' };
      }
      const onLeaveToday = await Leave.countDocuments({
        companyId: actor.companyId,
        status: 'approved',
        startDate: { $lte: todayStr },
        endDate: { $gte: todayStr },
      });
      const pendingCount = await Leave.countDocuments({ companyId: actor.companyId, status: 'pending' });
      const pendingRequests = await Leave.find({ companyId: actor.companyId, status: 'pending' })
        .populate('employeeId', 'name employeeCode department')
        .limit(5)
        .lean();

      return {
        result: {
          date: todayStr,
          employeesOnLeaveToday: onLeaveToday,
          totalPendingApprovals: pendingCount,
          recentPending: pendingRequests.map((l: any) => ({
            id: l._id,
            employeeName: l.employeeId?.name,
            employeeCode: l.employeeId?.employeeCode,
            type: l.typeName,
            startDate: l.startDate,
            endDate: l.endDate,
            days: l.workingDates?.length || 1,
            reason: l.reason,
          })),
        },
      };
    }

    case 'get_my_leave_balance': {
      // User can always check their own leave balance
      const currentYear = new Date().getFullYear();
      const balances = await leaveBalances(actor.companyId, actor.id, currentYear);
      return {
        result: {
          employeeName: actor.name,
          year: currentYear,
          balances: balances.map((b) => ({
            type: b.name,
            code: b.code,
            annualQuota: b.annualQuota,
            usedDays: b.used,
            pendingDays: b.pending,
            remainingDays: b.available,
          })),
        },
      };
    }

    case 'get_payroll_summary': {
      const month = args.month || todayStr.slice(0, 7);
      const run = await PayrollRun.findOne({ companyId: actor.companyId, month });

      if (actor.role === 'employee') {
        // Strict privacy: employee ONLY gets their own payslip from finalized runs!
        if (!run || run.status !== 'finalized') {
          return {
            result: {
              month,
              status: 'not_available',
              message: 'Your finalized payslip for this month is not yet published.',
            },
          };
        }
        const item = run.items.find((it) => it.employeeId.toString() === actor.id);
        if (!item) {
          return { result: { month, message: 'No payslip item found for your account.' } };
        }
        return {
          result: {
            month,
            status: 'finalized',
            employeeName: item.name,
            grossSalary: item.grossSalary,
            totalDeductions: item.totalDeductions,
            netSalary: item.netSalary,
            monthlyTax: item.monthlyTax,
            presentDays: item.presentDays,
            absentDays: item.absentDays,
          },
        };
      }

      // HR & Admin can see company totals
      if (!run) {
        return { result: { month, message: 'No payroll draft or finalized run created for this month.' } };
      }
      return {
        result: {
          month,
          status: run.status,
          totalEmployees: run.totalEmployees,
          totalGrossSalary: run.totalGrossSalary,
          totalDeductions: run.totalDeductions,
          totalTax: run.totalTax,
          totalNetSalary: run.totalNetSalary,
        },
      };
    }

    case 'search_employees': {
      if (actor.role === 'employee') {
        return { result: null, error: 'Unauthorized: Employee directory search via AI is restricted to HR and Admin.' };
      }
      const q = String(args.query || '').trim();
      const regex = new RegExp(q, 'i');
      const users = await User.find({
        companyId: actor.companyId,
        role: 'employee',
        $or: [{ name: regex }, { employeeCode: regex }, { department: regex }, { email: regex }],
      })
        .limit(10)
        .select('name employeeCode department designation email active joinedAt');

      return {
        result: {
          query: q,
          count: users.length,
          employees: users.map((u) => ({
            id: u._id,
            name: u.name,
            employeeCode: u.employeeCode,
            department: u.department,
            designation: u.designation,
            email: u.email,
            active: u.active,
          })),
        },
      };
    }

    default:
      return { result: null, error: `Unknown tool: ${toolName}` };
  }
}
