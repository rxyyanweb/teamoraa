'use client';
import { AccessibleModal } from '@/components/workforce/modal';
import { useState } from 'react';
import {
  Banknote,
  Receipt,
  FileCheck,
  ShieldCheck,
  Search,
  Filter,
  DollarSign,
  Download,
  AlertCircle,
  Calendar,
  Lock,
} from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/workforce/drawer';

export function AdminPayrollWorkspace() {
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedEmployeeItem, setSelectedEmployeeItem] = useState<any | null>(null);

  // Fetch current month payroll run
  const {
    data: runData,
    loading: runLoading,
    reload: reloadRun,
  } = useResource<any>(`/payroll/runs/${selectedMonth}`);

  // Fetch all payroll runs history
  const { data: runsHistory, reload: reloadHistory } = useResource<any[]>('/payroll/runs');

  const [finalizing, setFinalizing] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const currentRun = runData || null;
  const isFinalized = currentRun?.status === 'finalized';

  const handleFinalize = async () => {
    try {
      setFinalizing(true);
      setActionError('');
      setActionSuccess('');
      await api.mutate(`/payroll/finalize/${selectedMonth}`);
      setActionSuccess(`Payroll for ${selectedMonth} has been finalized and locked!`);
      setConfirmDialogOpen(false);
      await reloadRun();
      await reloadHistory();
    } catch (err: any) {
      setActionError(err.message || 'Failed to finalize payroll.');
    } finally {
      setFinalizing(false);
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
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Banknote className="h-6 w-6 text-success" />
            Company Payroll & Finalization
          </h1>
          <p className="text-sm text-muted-foreground">
            Review draft calculations submitted by HR, inspect attendance deductions, and finalize
            monthly disbursements.
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

          {currentRun && !isFinalized && (
            <Button
              onClick={() => setConfirmDialogOpen(true)}
              className="gap-2 shadow-sm bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Lock className="h-4 w-4" />
              Finalize Payroll
            </Button>
          )}

          {isFinalized && (
            <Badge className="bg-emerald-500/10 text-success dark:text-success border border-emerald-500/20 py-1.5 px-3">
              <ShieldCheck className="h-4 w-4 mr-1 text-success" />
              Locked & Finalized
            </Badge>
          )}
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

      {/* Confirmation Modal */}
      {confirmDialogOpen && (
        <AccessibleModal title="Finalize payroll" onClose={() => setConfirmDialogOpen(false)}>
          <div className="bg-card border border-border/80 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-warning">
              <Lock className="h-6 w-6" />
              <h3 className="font-bold text-lg text-foreground">Confirm Payroll Finalization</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to finalize payroll for <strong>{selectedMonth}</strong>?
            </p>
            <p className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40">
              Finalizing will lock all calculations, take an immutable snapshot, record an audit
              event, and make PDF payslips available for download by employees.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                disabled={finalizing}
                onClick={() => setConfirmDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={finalizing}
                onClick={handleFinalize}
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
              >
                {finalizing ? 'Finalizing...' : 'Yes, Finalize Payroll'}
              </Button>
            </div>
          </div>
        </AccessibleModal>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Employees Included
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {currentRun ? currentRun.totalEmployees : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Status: {currentRun ? currentRun.status.toUpperCase() : 'NO RUN'}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Total Gross Payroll
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              PKR {(currentRun?.totalGrossSalary || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sum of 1.5x basic across workforce</p>
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
              PKR {(currentRun?.totalTax || 0).toLocaleString()} income tax included
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Net Company Disbursement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success dark:text-success">
              PKR {(currentRun?.totalNetSalary || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Finalized payout obligation</p>
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

      {/* Main Review Table */}
      <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="payroll-table w-full text-left text-xs sm:text-sm">
            <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4 text-right">Basic</th>
                <th className="py-3 px-4 text-right">Gross</th>
                <th className="py-3 px-4 text-center">Days Worked</th>
                <th className="py-3 px-4 text-center">Absent/Half</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right">Tax</th>
                <th className="py-3 px-4 text-right">Net Salary</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {runLoading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground">
                    Loading payroll data for {selectedMonth}...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-muted-foreground">
                    {currentRun
                      ? 'No employees match your search criteria.'
                      : 'No payroll run available for this month. Ask HR to generate a draft.'}
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
                    <td className="py-3 px-4 text-center font-mono">
                      {item.eligibleWorkingDays} / {item.totalWorkingDays}d
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.absentDays}a / {item.halfDays}h
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
                          onClick={() => setSelectedEmployeeItem(item)}
                          className="h-8 px-2 text-xs text-success"
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

      {/* Employee Detail Drawer */}
      <Drawer
        open={!!selectedEmployeeItem}
        onClose={() => setSelectedEmployeeItem(null)}
        title={selectedEmployeeItem ? `${selectedEmployeeItem.name} — Full Breakdown` : ''}
        description="Immutable snapshot of salary, attendance and tax calculations"
        side="right"
      >
        {selectedEmployeeItem && (
          <div className="space-y-6 text-sm">
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

            <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1.5 text-xs">
              <div className="flex justify-between font-semibold">
                <span>Basic Salary</span>
                <span className="font-mono">
                  PKR {selectedEmployeeItem.basicSalary.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>HRA (40%)</span>
                <span className="font-mono">
                  PKR {selectedEmployeeItem.houseRentAllowance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Medical (10%)</span>
                <span className="font-mono">
                  PKR {selectedEmployeeItem.medicalAllowance.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-border/40 pt-1">
                <span>Gross Salary (1.5x)</span>
                <span className="font-mono text-success">
                  PKR {selectedEmployeeItem.grossSalary.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="bg-muted/30 p-3 rounded-lg border border-border/40 space-y-1.5 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Absence Deduction</span>
                <span className="font-mono text-danger">
                  -PKR {selectedEmployeeItem.absentDeduction.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Half-Day Deduction</span>
                <span className="font-mono text-danger">
                  -PKR {selectedEmployeeItem.halfDayDeduction.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Unpaid Leave</span>
                <span className="font-mono text-danger">
                  -PKR {selectedEmployeeItem.unpaidLeaveDeduction.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Monthly Tax</span>
                <span className="font-mono text-danger">
                  -PKR {selectedEmployeeItem.monthlyTax.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-border/40 pt-1 text-sm">
                <span>Net Pay</span>
                <span className="font-mono text-success">
                  PKR {selectedEmployeeItem.netSalary.toLocaleString()}
                </span>
              </div>
            </div>

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
