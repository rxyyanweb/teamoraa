'use client';
import { AccessibleModal } from '@/components/workforce/modal';
import { useState } from 'react';
import {
  Sparkles,
  Calendar,
  Check,
  AlertCircle,
  ArrowRight,
  X,
  Clock,
  HelpCircle,
} from 'lucide-react';
import { aiErrorMessage } from '@/services/ai-errors';
import { api } from '@/services/api';
import type { SmartLeaveDraft } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Feedback } from '@/components/shared/feedback';

interface SmartLeaveResponse {
  draft?: {
    type: string;
    typeName: string;
    startDate: string;
    endDate: string;
    workingDays: number;
    reason: string;
  };
  balance?: {
    remainingDays: number;
    sufficientBalance: boolean;
  };
  warnings?: string[];
  leaveTypeCode?: string;
  startDate?: string;
  endDate?: string;
  workingDays?: number;
  reason?: string;
  quotaAvailable?: number | null;
  quotaRemainingAfter?: number | null;
}

interface SmartLeaveModalProps {
  open: boolean;
  onClose: () => void;
  onApplyDraft: (draft: {
    type: string;
    startDate: string;
    endDate: string;
    reason: string;
  }) => void;
}

const SAMPLE_PROMPTS = [
  'Mujhe kal se 2 din bukhar hai chutti chahiye',
  'Family emergency in Lahore, need leave next Monday and Tuesday',
  'Severe migraine today, need sick leave for today and tomorrow',
  'Attending brother wedding next week from Wednesday to Friday',
];

export function SmartLeaveModal({ open, onClose, onApplyDraft }: SmartLeaveModalProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<SmartLeaveResponse | null>(null);

  if (!open) return null;

  const handleAnalyze = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError('');
    setDraft(null);

    try {
      const res = await api.mutate<SmartLeaveResponse>('/ai/smart-leave', { prompt }, 'POST');
      setDraft(res);
    } catch (err) {
      setError(aiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const extractedType = draft?.draft?.type || draft?.leaveTypeCode || 'annual';
  const extractedStart = draft?.draft?.startDate || draft?.startDate || '';
  const extractedEnd = draft?.draft?.endDate || draft?.endDate || '';
  const extractedDays = draft?.draft?.workingDays ?? draft?.workingDays ?? 1;
  const extractedReason = draft?.draft?.reason || draft?.reason || '';
  const remainingDays = draft?.balance?.remainingDays ?? draft?.quotaRemainingAfter ?? null;

  const handleConfirmAndProceed = () => {
    if (!draft) return;
    onApplyDraft({
      type: extractedType,
      startDate: extractedStart,
      endDate: extractedEnd,
      reason: extractedReason,
    });
    onClose();
  };

  return (
    <AccessibleModal title="Smart leave request" onClose={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-muted shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4 bg-muted">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/20 text-success border border-emerald-500/30">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                Smart Leave Assistant
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-success border border-emerald-500/20">
                  Gemini AI
                </span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Express your leave naturally in English or Roman Urdu
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && <Feedback message={error} />}

          <div>
            <label className="text-xs font-semibold text-foreground block mb-1.5">
              What kind of leave do you need?
            </label>
            <textarea
              rows={3}
              placeholder="e.g. 'Mujhe kal bukhar hai chutti chahiye' or 'Taking next Monday and Tuesday off for family travel'"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              className="w-full rounded-xl border border-border bg-muted p-3 text-xs text-foreground placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none disabled:opacity-50"
            />
          </div>

          {/* Prompt suggestions */}
          <div>
            <span className="text-[11px] text-muted-foreground block mb-1.5 font-medium">
              💡 Quick Examples (Click to test):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_PROMPTS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(p)}
                  className="rounded-lg border border-border/50 bg-muted hover:bg-muted px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1">
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={loading || !prompt.trim()}
              className="w-full bg-primary hover:bg-[var(--primary-hover)] text-primary-foreground text-xs h-9 gap-2 cursor-pointer shadow-md font-medium"
            >
              <Sparkles className="size-3.5 text-amber-200" />
              {loading
                ? 'Analyzing with Gemini & calculating quotas...'
                : 'Analyze & Generate Draft'}
            </Button>
          </div>

          {/* AI Extracted Draft Result */}
          {draft && (
            <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-4 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                <span className="text-xs font-bold text-success flex items-center gap-1.5">
                  <Check className="size-3.5" /> AI Extracted Leave Details
                </span>
                <span className="text-[10px] text-muted-foreground uppercase font-mono">
                  Ready to review
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Leave Type</span>
                  <span className="font-semibold text-foreground capitalize">
                    {extractedType} Leave
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Working Days</span>
                  <span className="font-semibold text-success">
                    {extractedDays} {extractedDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Date Range</span>
                  <span className="font-semibold text-foreground">
                    {extractedStart} → {extractedEnd}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Balance Check</span>
                  <span className="font-medium text-muted-foreground">
                    {remainingDays !== null
                      ? `${remainingDays} days balance remaining`
                      : 'Unlimited / Standard quota'}
                  </span>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-2.5 border border-border/40">
                <span className="text-[10px] text-muted-foreground block mb-0.5">
                  Synthesized Reason:
                </span>
                <p className="text-xs text-foreground italic">&ldquo;{extractedReason}&rdquo;</p>
              </div>

              {draft.warnings && draft.warnings.length > 0 && (
                <div className="space-y-1">
                  {draft.warnings.map((w, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[11px] text-warning"
                    >
                      <AlertCircle className="size-3.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={handleConfirmAndProceed}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9 gap-2 cursor-pointer shadow-lg"
                >
                  <span>Review in Application Form</span>
                  <ArrowRight className="size-4" />
                </Button>
                <p className="text-[10px] text-center text-muted-foreground mt-1.5">
                  🛡️ AI never directly submits leave. You can inspect, modify, and confirm before
                  final submission.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </AccessibleModal>
  );
}
