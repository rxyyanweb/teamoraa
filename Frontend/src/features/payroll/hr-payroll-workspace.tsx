'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Banknote,
  Receipt,
  FileCheck,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  TrendingDown,
  Building,
  User,
  ChevronRight,
  Download,
  AlertCircle,
  Clock,
  Calendar,
} from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/workforce/drawer';

export function HrPayrollWorkspace() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [bonusRuleEnabled, setBonusRuleEnabled] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedEmployeeItem, setSelectedEmployeeItem] = useState<any | null>(null);
  const [updatingSalary, setUpdatingSalary] = useState(false);
  const [newBasicSalary, setNewBasicSalary] = useState('');
  const [salaryMessage, setSalaryMessage] = useState('');

  // Fetch current month payroll run (draft or finalized)
  const {
    data: runData,
    loading: runLoading,
    reload: reloadRun,
  } = useResource<any>(`/payroll/runs/${selectedMonth}`);

  // Fetch payroll runs list
  const { data: runsListData, reload: reloadRunsList } = useResource<any[]>('/payroll/runs');

  // Fetch employees list for salary structure management
  const { data: employeesData } = useResource<{ users: any[] }>('/employees?page=1');

  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const currentRun = runData || null;
  const isFinalized = currentRun?.status === 'finalized';

  const handleGenerateDraft = async () => {
    try {
      setGenerating(true);
      setActionError('');
      setActionSuccess('');
      await api.mutate('/payroll/draft', {
        month: selectedMonth,
        latePenaltyBonusEnabled: bonusRuleEnabled,
      });
      setActionSuccess(`Payroll draft for ${selectedMonth} generated successfully!`);
      await reloadRun();
      await reloadRunsList();
    } catch (err: any) {
      setActionError(err.message || 'Failed to generate payroll draft.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateSalary = async (employeeId: string) => {
    try {
      setUpdatingSalary(true);
      setSalaryMessage('');
      const amount = parseFloat(newBasicSalary);
      if (isNaN(amount) || amount < 0) {
        setSalaryMessage('Please enter a valid basic salary.');
        return;
      }
      await api.mutate(`/payroll/salary-structure/${employeeId}`, { basicSalary: amount }, 'PUT');
      setSalaryMessage('Salary structure updated successfully!');
      // Update selected item basic salary
      if (selectedEmployeeItem) {
        setSelectedEmployeeItem({
          ...selectedEmployeeItem,
          basicSalary: amount,
          grossSalary: amount * 1.5,
        });
      }
    } catch (err: any) {
      setSalaryMessage(err.message || 'Failed to update salary.');
    } finally {
      setUpdatingSalary(false);
    }
  };

  const handleDownloadPdf = async (item: any) => {
    try {
      const filename = `Payslip-${item.employeeCode}-${selectedMonth}.pdf`;
      await api.downloadPdf(
        `/payroll/payslip/${selectedMonth}/pdf?employeeId=${item.employeeId}`,
        filename,
      );
    } catch (err: any) {
      alert(err.message || 'Download failed.');
    }
  };

  const items = currentRun?.items || [];
  const departments = Array.from(new Set(items.map((it: any) => it.department || 'General')));

  const filteredItems = items.filter((it: any) => {
    const matchSearch =
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.employeeCode.toLowerCase().includes(search.toLowerCase());
    const matchDept = selectedDept === 'all' || (it.department || 'General') === selectedDept;
    return matchSearch && matchDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Month Filter */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Banknote className="h-6 w-6 text-success" />
            Payroll & Salaries
          </h1>
          <p className="text-sm text-muted-foreground">
            Calculate monthly salary breakdowns, attendance deductions, and prepare drafts for admin
            finalization.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border/60 rounded-lg px-3 py-1.5 shadow-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              aria-label="Payroll month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none"
            />
          </div>

          <Button
            onClick={handleGenerateDraft}
            disabled={generating || isFinalized}
            className="gap-2 shadow-sm bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
            {currentRun ? 'Recalculate Draft' : 'Generate Payroll Draft'}
          </Button>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-success dark:text-success p-3 rounded-lg text-sm flex items-center gap-2">
          <FileCheck className="h-4 w-4 shrink-0" />
          {actionSuccess}
        </div>
      )}

      {actionError && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {actionError}
        </div>
      )}

      {/* Bonus Rule Toggle Card */}
      <div className="bg-card/60 border border-border/60 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-success shrink-0" />
          <div>
            <span className="font-semibold text-foreground">Late arrival deduction: </span>
            <span className="text-muted-foreground">
              3 late arrivals = 0.5-day salary deduction.
            </span>
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={bonusRuleEnabled}
            disabled={isFinalized}
            onChange={(e) => setBonusRuleEnabled(e.target.checked)}
            className="rounded border-border text-success focus:ring-emerald-500"
          />
          <span className="text-foreground font-medium">Enable for this draft</span>
        </label>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {currentRun ? currentRun.totalEmployees : 0}
            </div>
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
              Status:{' '}
              {isFinalized ? (
                <span className="text-success font-semibold uppercase">Finalized</span>
              ) : currentRun ? (
                <span className="text-warning font-semibold uppercase">Draft Mode</span>
              ) : (
                <span className="text-muted-foreground">Not Created</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Gross Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              PKR {(currentRun?.totalGrossSalary || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">1.5 × Basic Salary across company</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Deductions & Tax
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger dark:text-danger">
              PKR {(currentRun?.totalDeductions || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Includes PKR {(currentRun?.totalTax || 0).toLocaleString()} income tax
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Net Disbursement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success dark:text-success">
              PKR {(currentRun?.totalNetSalary || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ready for employee bank transfers</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-md bg-card border border-border/60 rounded-lg px-3 py-1.5 shadow-sm">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            aria-label="Search payroll"
            placeholder="Search employee name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="bg-card border border-border/60 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none"
          >
            <option value="all">All Departments</option>
            {departments.map((dept: any) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Payroll Table */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="payroll-table w-full text-left text-xs sm:text-sm">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Basic</th>
                <th className="py-3 px-4 text-right">Gross</th>
                <th className="py-3 px-4 text-center">Worked/Eligible</th>
                <th className="py-3 px-4 text-center">Absent/Half</th>
                <th className="py-3 px-4 text-center">Unpaid Leave</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Net Salary</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {runLoading ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-success" />
                    Loading payroll data for {selectedMonth}...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-muted-foreground">
                    {currentRun ? (
                      'No employees match your search criteria.'
                    ) : (
                      <div className="max-w-sm mx-auto space-y-3">
                        <Receipt className="h-10 w-10 text-muted-foreground mx-auto" />
                        <p className="font-semibold text-foreground">
                          No payroll draft generated yet
                        </p>
                        <p className="text-xs">
                          Click "Generate Payroll Draft" to calculate salaries based on attendance
                          and leaves for this month.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => (
                  <tr key={item.employeeId} className="hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-foreground">{item.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {item.employeeCode}
                      </div>
                    </td>
                    <td className="py-3 px-4">{item.department || 'General'}</td>
                    <td className="py-3 px-4 font-mono">PKR {item.basicSalary.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-medium">
                      PKR {item.grossSalary.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded bg-muted text-xs font-mono">
                        {item.eligibleWorkingDays} / {item.totalWorkingDays}d
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.absentDays > 0 ? (
                        <span className="text-danger font-semibold">{item.absentDays}a</span>
                      ) : (
                        <span className="text-muted-foreground">0a</span>
                      )}
                      {' / '}
                      {item.halfDays > 0 ? (
                        <span className="text-warning font-semibold">{item.halfDays}h</span>
                      ) : (
                        <span className="text-muted-foreground">0h</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.unpaidLeaveDays > 0 ? (
                        <span className="text-danger font-semibold">{item.unpaidLeaveDays}d</span>
                      ) : (
                        <span className="text-muted-foreground">0d</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-danger dark:text-danger font-mono">
                      -PKR {item.totalAttendanceDeductions.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-mono">PKR {item.monthlyTax.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-success dark:text-success">
                      PKR {item.netSalary.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmployeeItem(item);
                            setNewBasicSalary(String(item.basicSalary));
                            setSalaryMessage('');
                          }}
                          className="h-8 px-2 text-xs text-success hover:text-success"
                        >
                          Details
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPdf(item)}
                          className="h-8 px-2 text-xs"
                          title="Download Payslip PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Detail & Salary Adjustment Drawer */}
      <Drawer
        open={!!selectedEmployeeItem}
        onClose={() => setSelectedEmployeeItem(null)}
        title={selectedEmployeeItem ? `${selectedEmployeeItem.name} — Payslip Breakdown` : ''}
        description="Comprehensive salary structure, attendance deductions and tax breakdown"
        side="right"
      >
        {selectedEmployeeItem && (
          <div className="space-y-6 text-sm">
            {/* Quick Profile */}
            <div className="bg-muted/40 p-4 rounded-xl border border-border/40 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Employee Code</span>
                <span className="font-mono font-medium">{selectedEmployeeItem.employeeCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{selectedEmployeeItem.department}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Designation</span>
                <span className="font-medium">{selectedEmployeeItem.designation}</span>
              </div>
            </div>

            {/* Salary Structure Form */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-success" />
                Salary Structure (Formula: Gross = 1.5 × Basic)
              </h3>
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Basic Salary (PKR)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newBasicSalary}
                    onChange={(e) => setNewBasicSalary(e.target.value)}
                    className="flex-1 bg-card border border-border/60 rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none"
                    placeholder="e.g. 50000"
                    disabled={isFinalized}
                  />
                  <Button
                    size="sm"
                    disabled={updatingSalary || isFinalized}
                    onClick={() => handleUpdateSalary(selectedEmployeeItem.employeeId)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                  >
                    {updatingSalary ? 'Updating...' : 'Save Basic'}
                  </Button>
                </div>
                {salaryMessage && (
                  <p className="text-xs text-success font-medium">{salaryMessage}</p>
                )}
              </div>

              <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">House Rent Allowance (HRA 40%)</span>
                  <span className="font-mono font-medium">
                    PKR {selectedEmployeeItem.houseRentAllowance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Medical Allowance (10%)</span>
                  <span className="font-mono font-medium">
                    PKR {selectedEmployeeItem.medicalAllowance.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
                  <span>Gross Salary</span>
                  <span className="font-mono text-success">
                    PKR {selectedEmployeeItem.grossSalary.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Attendance & Deductions Breakdown */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-danger" />
                Deductions Breakdown
              </h3>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Daily Pay Rate</span>
                  <span className="font-mono font-medium">
                    PKR {selectedEmployeeItem.dailyRate.toLocaleString()} / day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Absences ({selectedEmployeeItem.absentDays} days)
                  </span>
                  <span className="font-mono text-danger">
                    -PKR {selectedEmployeeItem.absentDeduction.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Half-Days ({selectedEmployeeItem.halfDays} days @ 0.5)
                  </span>
                  <span className="font-mono text-danger">
                    -PKR {selectedEmployeeItem.halfDayDeduction.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Unpaid Leave ({selectedEmployeeItem.unpaidLeaveDays} days)
                  </span>
                  <span className="font-mono text-danger">
                    -PKR {selectedEmployeeItem.unpaidLeaveDeduction.toLocaleString()}
                  </span>
                </div>
                {selectedEmployeeItem.latePenaltyDeduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Late Arrival Penalty</span>
                    <span className="font-mono text-danger">
                      -PKR {selectedEmployeeItem.latePenaltyDeduction.toLocaleString()}
                    </span>
                  </div>
                )}
                {selectedEmployeeItem.prorationDeduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Joining Mid-Month Proration</span>
                    <span className="font-mono text-danger">
                      -PKR {selectedEmployeeItem.prorationDeduction.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/60 pt-1.5 font-bold">
                  <span>Total Attendance Deductions</span>
                  <span className="font-mono text-danger">
                    -PKR {selectedEmployeeItem.totalAttendanceDeductions.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Tax & Net Pay */}
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Receipt className="h-4 w-4 text-success" />
                Taxation & Net Payable
              </h3>
              <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Annual Gross Reference</span>
                  <span className="font-mono">
                    PKR {(selectedEmployeeItem.grossSalary * 12).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Monthly Tax Deduction</span>
                  <span className="font-mono text-danger">
                    -PKR {selectedEmployeeItem.monthlyTax.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2 font-bold text-sm">
                  <span>Net Payable Salary</span>
                  <span className="font-mono text-success text-base">
                    PKR {selectedEmployeeItem.netSalary.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* PDF Action */}
            <Button
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white gap-2"
              onClick={() => handleDownloadPdf(selectedEmployeeItem)}
            >
              <Download className="h-4 w-4" />
              Download Official PDF Payslip
            </Button>
          </div>
        )}
      </Drawer>
    </div>
  );
}
