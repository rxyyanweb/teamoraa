'use client';
import { useState } from 'react';
import {
  Receipt,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  TrendingDown,
  Building,
} from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function EmployeePayslipsView() {
  const { data: payslips, loading, reload } = useResource<any[]>('/payroll/my-payslips');
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);

  const handleDownload = async (month: string, employeeCode: string) => {
    try {
      setDownloadingMonth(month);
      const filename = `My-Payslip-${employeeCode}-${month}.pdf`;
      await api.downloadPdf(`/payroll/payslip/${month}/pdf`, filename);
    } catch (err: any) {
      alert(err.message || 'Download failed.');
    } finally {
      setDownloadingMonth(null);
    }
  };

  const list = payslips || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-border/40 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6 text-success" />
          My Payslips & Salary History
        </h1>
        <p className="text-sm text-muted-foreground">
          View your finalized monthly salary breakdowns and download official computer-generated PDF
          payslips.
        </p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2 text-success" />
          Loading your payslips...
        </div>
      ) : list.length === 0 ? (
        <Card className="border-border/60">
          <CardContent className="p-12 text-center space-y-3">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="font-semibold text-lg text-foreground">
              No Finalized Payslips Available
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your payslip will appear here once the administrator finalizes the monthly payroll
              run.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {list.map(({ month, finalizedAt, item }: any) => (
            <Card
              key={month}
              className="border-border/60 shadow-sm hover:border-emerald-600/40 transition-colors"
            >
              <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-success" />
                    Period: {month}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Finalized on:{' '}
                    {finalizedAt ? new Date(finalizedAt).toLocaleDateString('en-PK') : 'Confirmed'}
                  </p>
                </div>
                <Badge className="bg-emerald-500/10 text-success dark:text-success border border-emerald-500/20 text-xs">
                  <CheckCircle className="h-3 w-3 mr-1" /> Finalized
                </Badge>
              </CardHeader>

              <CardContent className="pt-4 space-y-4">
                {/* Salary Overview Numbers */}
                <div className="grid grid-cols-3 gap-2 text-center bg-muted/30 p-3 rounded-lg border border-border/40">
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Gross Pay</span>
                    <span className="font-mono text-xs font-semibold">
                      PKR {item.grossSalary.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Deductions</span>
                    <span className="font-mono text-xs font-semibold text-danger">
                      -PKR {item.totalDeductions.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block">Net Payable</span>
                    <span className="font-mono text-xs font-bold text-success">
                      PKR {item.netSalary.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Days Breakdown */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Days Worked / Eligible:</span>
                    <span className="font-mono text-foreground font-medium">
                      {item.presentDays} / {item.eligibleWorkingDays} days
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Absences & Half-Days:</span>
                    <span className="font-mono text-foreground font-medium">
                      {item.absentDays}a / {item.halfDays}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Income Tax Deducted:</span>
                    <span className="font-mono text-foreground font-medium">
                      PKR {item.monthlyTax.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Download Button */}
                <Button
                  className="w-full bg-emerald-700 hover:bg-emerald-800 text-white gap-2 text-xs"
                  disabled={downloadingMonth === month}
                  onClick={() => handleDownload(month, item.employeeCode)}
                >
                  <Download className="h-3.5 w-3.5" />
                  {downloadingMonth === month
                    ? 'Generating PDF...'
                    : 'Download Official PDF Payslip'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
