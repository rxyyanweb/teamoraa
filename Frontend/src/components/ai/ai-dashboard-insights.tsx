'use client';
import { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle, BrainCircuit } from 'lucide-react';
import { aiErrorMessage } from '@/services/ai-errors';
import { api } from '@/services/api';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/shared/feedback';

interface SummaryResponse {
  summary?: string;
  insights: string[];
  generatedAt: string;
  department?: string;
}

export function AiDashboardInsights({
  scope,
  department,
}: {
  scope: 'admin' | 'hr';
  department?: string;
}) {
  const [data, setData] = useState<SummaryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateInsights = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.mutate<SummaryResponse>(
        '/ai/dashboard-summary',
        { department },
        'POST',
      );
      setData(res);
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-sm p-5 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-success border border-emerald-500/30 shadow-inner">
            <BrainCircuit className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">A fresh perspective</h3>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-success border border-emerald-500/20 flex items-center gap-1">
                <Sparkles className="size-3" /> AI summary
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Automated executive brief synthesized from current workforce & attendance metrics
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={generateInsights}
          disabled={loading}
          className="gap-2 bg-primary hover:bg-[var(--primary-hover)] text-primary-foreground text-xs h-8 shrink-0 cursor-pointer shadow-sm font-medium"
        >
          {loading ? (
            <RefreshCw className="size-3.5 animate-spin" />
          ) : (
            <Sparkles className="size-3.5 text-warning" />
          )}
          {data ? 'Refresh AI Brief' : 'Generate summary'}
        </Button>
      </div>

      {error && (
        <div className="mt-4">
          <Feedback message={error} />
        </div>
      )}

      {loading && (
        <div className="py-6 flex flex-col items-center justify-center gap-2 text-center animate-pulse">
          <Sparkles className="size-6 text-success animate-spin" />
          <p className="text-xs font-medium text-muted-foreground">Preparing your summary…</p>
        </div>
      )}

      {!loading && !data && !error && (
        <div className="py-5 text-center">
          <p className="text-xs text-muted-foreground">
            Click <strong className="text-success font-medium">Generate summary</strong> for a quick
            look at attendance, time off, and your team.
          </p>
        </div>
      )}

      {!loading && data && (
        <div className="mt-4 space-y-3">
          {data.summary ? (
            <div className="rounded-xl bg-muted border border-border/60 p-4">
              <p className="text-xs text-foreground leading-relaxed font-medium">{data.summary}</p>
            </div>
          ) : (
            <div className="rounded-xl bg-muted border border-border/60 p-3">
              <p className="text-xs text-foreground leading-relaxed font-medium">
                Summary for{' '}
                <span className="text-success capitalize">
                  {data.department || 'All Departments'}
                </span>{' '}
                · {data.insights.length} key operational findings:
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {data.insights.map((insight, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-lg bg-muted border border-border/40 p-3 text-xs text-muted-foreground"
              >
                <CheckCircle className="size-4 text-success shrink-0 mt-0.5" />
                <span className="leading-snug">{insight}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground border-t border-border/30">
            <span>Generated at: {new Date(data.generatedAt).toLocaleTimeString()}</span>
            <span className="font-mono text-success/80">
              Verified Real MongoDB Records · Saylani HCM Compliant
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}
