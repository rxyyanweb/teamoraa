'use client';
import { Clock, Receipt, Download, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function EmployeePersonalPayrollSection() {
  const { data, loading } = useResource<any>('/analytics/employee');

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">
        Loading salary insights...
      </div>
    );
  }

  if (!data) return null;

  const { todayAttendance, metrics, lastFinalizedPayslip } = data;

  const handleDownload = async (month: string) => {
    try {
      const filename = `My-Payslip-${month}.pdf`;
      await api.downloadPdf(`/payroll/payslip/${month}/pdf`, filename);
    } catch (err: any) {
      alert(err.message || 'Download failed.');
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="border-b border-border/40 pb-2">
        <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="h-5 w-5 text-success" />
          Your day, at a glance
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Today's Attendance Status */}
        <Card className="border-border/60 shadow-sm p-4 space-y-2">
          <span className="text-xs text-muted-foreground font-medium block">
            Today's Attendance
          </span>
          {todayAttendance ? (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/10 text-success dark:text-success border border-emerald-500/20 text-xs">
                  {todayAttendance.checkedOutAt ? 'Shift complete' : 'Checked in'}
                </Badge>
                {todayAttendance.isLate && (
                  <Badge className="bg-amber-500/10 text-warning text-xs">Late</Badge>
                )}
                {todayAttendance.isHalfDay && (
                  <Badge className="bg-rose-500/10 text-danger text-xs">Half Day</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Duration: {Math.round(((todayAttendance.workedMinutes || 0) / 60) * 10) / 10} hours
                worked
              </p>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">You haven't checked in yet today.</div>
          )}
        </Card>

        {/* Month Hours & Lates */}
        <Card className="border-border/60 shadow-sm p-4 space-y-1">
          <span className="text-xs text-muted-foreground font-medium block">
            Monthly Work Hours
          </span>
          <div className="text-xl font-bold font-mono text-foreground">
            {metrics.totalWorkedHoursThisMonth}h / {metrics.standardMonthlyHours}h
          </div>
          <p className="text-xs text-muted-foreground">
            Late arrivals this month:{' '}
            <span className="font-semibold text-warning">{metrics.monthlyLateCount}</span>
          </p>
        </Card>

        {/* Latest Payslip Summary */}
        <Card className="border-border/60 shadow-sm p-4 space-y-2">
          <span className="text-xs text-muted-foreground font-medium block">
            Latest Finalized Payslip
          </span>
          {lastFinalizedPayslip ? (
            <div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-success font-mono">
                  PKR {lastFinalizedPayslip.netSalary.toLocaleString()}
                </span>
                <span className="text-muted-foreground font-mono">
                  {lastFinalizedPayslip.month}
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full mt-2 h-7 text-xs gap-1.5"
                onClick={() => handleDownload(lastFinalizedPayslip.month)}
              >
                <Download className="h-3 w-3" /> Download PDF
              </Button>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">
              No finalized payslip available yet for this cycle.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
