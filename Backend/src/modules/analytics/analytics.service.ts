import { User } from '../users/user.model.js';
import { Attendance } from '../attendance/attendance.model.js';
import { Leave } from '../leave/leave.model.js';
import { PayrollRun } from '../payroll/payroll.model.js';
import { Company } from '../organization/company.model.js';
import { localDate } from '../../utils/company-date.js';

export async function getAdminAnalytics(companyId: string) {
  const company = await Company.findById(companyId);
  const timezone = company?.timezone || 'Asia/Karachi';

  // 1. Total Headcount & Active Employees
  const totalEmployees = await User.countDocuments({ companyId, role: 'employee' });
  const activeEmployees = await User.countDocuments({ companyId, role: 'employee', active: true });
  const inactiveEmployees = totalEmployees - activeEmployees;

  // Attrition YTD = Inactive Employees / (Total Employees || 1) * 100
  const attritionRate = totalEmployees > 0
    ? Math.round((inactiveEmployees / totalEmployees) * 1000) / 10
    : 0;

  // 2. Headcount by Department
  const headcountByDept = await User.aggregate([
    { $match: { companyId: company!._id, role: 'employee' } },
    { $group: { _id: { $ifNull: ['$department', 'Unassigned'] }, count: { $sum: 1 } } },
    { $project: { department: '$_id', count: 1, _id: 0 } },
    { $sort: { count: -1 } },
  ]);

  // 3. Payroll Aggregates (From finalized runs, fallback to latest run)
  const latestRun = await PayrollRun.findOne({ companyId }).sort({ month: -1 });
  const monthlyPayrollCost = latestRun ? latestRun.totalNetSalary : 0;
  const totalGrossCost = latestRun ? latestRun.totalGrossSalary : 0;
  const totalTaxCost = latestRun ? latestRun.totalTax : 0;

  // Average Salary
  const averageSalary = activeEmployees > 0 && latestRun
    ? Math.round(latestRun.totalNetSalary / activeEmployees)
    : 0;

  // Payroll Cost by Department
  const payrollCostByDept: Record<string, number> = {};
  if (latestRun) {
    for (const item of latestRun.items) {
      const dept = item.department || 'General';
      payrollCostByDept[dept] = Math.round(((payrollCostByDept[dept] || 0) + item.netSalary) * 100) / 100;
    }
  }

  // 4. Payroll Spending Trends (Last 6 months runs)
  const recentRuns = await PayrollRun.find({ companyId })
    .sort({ month: -1 })
    .limit(6)
    .select('month status totalGrossSalary totalNetSalary totalTax');

  const spendingTrends = recentRuns.reverse().map((r) => ({
    month: r.month,
    status: r.status,
    grossSalary: r.totalGrossSalary,
    netSalary: r.totalNetSalary,
    tax: r.totalTax,
  }));

  return {
    kpis: {
      totalHeadcount: totalEmployees,
      activeHeadcount: activeEmployees,
      attritionYtd: attritionRate,
      monthlyPayrollCost,
      totalGrossCost,
      totalTaxCost,
      averageSalary,
      payrollMonth: latestRun?.month || null,
      payrollStatus: latestRun?.status || null,
    },
    headcountByDepartment: headcountByDept,
    payrollCostByDepartment: Object.entries(payrollCostByDept).map(([department, cost]) => ({
      department,
      cost,
    })),
    payrollSpendingTrends: spendingTrends,
  };
}

export async function getHrAnalytics(companyId: string) {
  const company = await Company.findById(companyId);
  const timezone = company?.timezone || 'Asia/Karachi';
  const todayStr = localDate(new Date(), timezone);

  // 1. Headcount
  const totalEmployees = await User.countDocuments({ companyId, role: 'employee' });

  // 2. Attendance Today
  const todayAttendances = await Attendance.find({ companyId, date: todayStr });
  const lateToday = todayAttendances.filter((a) => a.isLate).length;
  const halfDayToday = todayAttendances.filter((a) => a.isHalfDay).length;
  const presentToday = todayAttendances.filter((a) => !a.isHalfDay).length;

  // 3. On Leave Today
  const onLeaveToday = await Leave.countDocuments({
    companyId,
    status: 'approved',
    startDate: { $lte: todayStr },
    endDate: { $gte: todayStr },
  });

  // 4. Pending Approvals
  const pendingLeaves = await Leave.countDocuments({ companyId, status: 'pending' });

  // 5. Attendance Trends (Past 7 days)
  const past7DaysAttendances = await Attendance.aggregate([
    { $match: { companyId: company!._id } },
    {
      $group: {
        _id: { date: '$date' },
        present: { $sum: { $cond: [{ $eq: ['$isHalfDay', false] }, 1, 0] } },
        late: { $sum: { $cond: [{ $eq: ['$isLate', true] }, 1, 0] } },
        halfDay: { $sum: { $cond: [{ $eq: ['$isHalfDay', true] }, 1, 0] } },
      },
    },
    { $sort: { '_id.date': 1 } },
  ]);

  const trendsMap = past7DaysAttendances.map((item) => ({
    date: item._id.date,
    present: item.present,
    late: item.late,
    halfDay: item.halfDay,
  }));

  // 6. Leave Usage by Type
  const leaveUsageByType = await Leave.aggregate([
    { $match: { companyId: company!._id, status: 'approved' } },
    { $group: { _id: '$type', count: { $sum: { $size: '$workingDates' } } } },
    { $project: { typeCode: '$_id', totalDays: '$count', _id: 0 } },
  ]);

  // 7. Top Late-Comers (Current month)
  const currentMonthPrefix = todayStr.slice(0, 7);
  const topLateComers = await Attendance.aggregate([
    {
      $match: {
        companyId: company!._id,
        isLate: true,
        date: { $regex: `^${currentMonthPrefix}` },
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
        employeeId: '$_id',
        name: '$user.name',
        employeeCode: '$user.employeeCode',
        department: '$user.department',
        lateCount: 1,
        _id: 0,
      },
    },
  ]);

  return {
    kpis: {
      headcount: totalEmployees,
      presentToday,
      lateToday,
      halfDayToday,
      onLeaveToday,
      pendingApprovals: pendingLeaves,
    },
    attendanceTrends: trendsMap.slice(-7),
    leaveUsageByType,
    topLateComers,
  };
}

export async function getEmployeePersonalAnalytics(companyId: string, employeeId: string) {
  const company = await Company.findById(companyId);
  const timezone = company?.timezone || 'Asia/Karachi';
  const todayStr = localDate(new Date(), timezone);
  const currentMonth = todayStr.slice(0, 7);

  // Today's attendance
  const todayAttendance = await Attendance.findOne({
    companyId,
    employeeId,
    date: todayStr,
  });

  // Late count in current month
  const monthlyLateCount = await Attendance.countDocuments({
    companyId,
    employeeId,
    status: 'late',
    date: { $regex: `^${currentMonth}` },
  });

  // Hours worked this month
  const recentAttendances = await Attendance.find({
    companyId,
    employeeId,
    date: { $gte: todayStr.slice(0, 8) + '01' },
  });

  const totalWorkedMinutesThisMonth = recentAttendances.reduce(
    (acc, cur) => acc + (cur.workedMinutes || 0),
    0,
  );
  const totalWorkedHoursThisMonth = Math.round((totalWorkedMinutesThisMonth / 60) * 10) / 10;

  // Last finalized payslip
  const lastFinalizedRun = await PayrollRun.findOne({
    companyId,
    status: 'finalized',
  }).sort({ month: -1 });

  const lastPayslipItem = lastFinalizedRun?.items.find(
    (it) => it.employeeId.toString() === employeeId,
  );

  return {
    todayAttendance: todayAttendance
      ? {
          isLate: todayAttendance.isLate,
          isHalfDay: todayAttendance.isHalfDay,
          checkedInAt: todayAttendance.checkedInAt,
          checkedOutAt: todayAttendance.checkedOutAt,
          workedMinutes: todayAttendance.workedMinutes,
        }
      : null,
    metrics: {
      monthlyLateCount,
      totalWorkedHoursThisMonth,
      standardMonthlyHours: 160,
    },
    lastFinalizedPayslip: lastPayslipItem
      ? {
          month: lastFinalizedRun?.month,
          finalizedAt: lastFinalizedRun?.finalizedAt,
          grossSalary: lastPayslipItem.grossSalary,
          totalDeductions: lastPayslipItem.totalDeductions,
          netSalary: lastPayslipItem.netSalary,
        }
      : null,
  };
}
