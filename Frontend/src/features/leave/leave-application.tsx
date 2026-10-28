'use client';
import { useState, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { motion } from 'motion/react';
import type { LeaveType } from '@/types/workforce';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Notice, queryString, dateLabel } from '@/components/workforce/primitives';
type Preview = {
  workingDays: number;
  workingDates: string[];
  timezone: string;
  allocations: { year: number; days: number }[];
};
const asDate = (s: string) => (s ? new Date(s + 'T12:00:00') : undefined);
const iso = (d: Date) =>
  [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
export function LeaveApplication({
  types,
  today,
  onSaved,
  initialDraft,
}: {
  types: LeaveType[];
  today: string;
  onSaved: () => void;
  initialDraft?: Partial<{ type: string; startDate: string; endDate: string; reason: string }>;
}) {
  const [type, setType] = useState(initialDraft?.type ?? types[0]?.code ?? '');
  const [startDate, setStart] = useState(initialDraft?.startDate ?? '');
  const [endDate, setEnd] = useState(initialDraft?.endDate ?? '');
  const [reason, setReason] = useState(initialDraft?.reason ?? '');

  const [preview, setPreview] = useState<{ key: string; data: Preview | null; error: string }>({
    key: '',
    data: null,
    error: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const key = queryString({ type, startDate, endDate });
  useEffect(() => {
    if (!type || !startDate || !endDate) return;
    let active = true;
    const timer = setTimeout(() => {
      void api.get<Preview>('/leave/preview?' + key).then(
        (data) => {
          if (active) setPreview({ key, data, error: '' });
        },
        (e) => {
          if (active) setPreview({ key, data: null, error: e.message });
        },
      );
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key, type, startDate, endDate]);
  const ready = preview.key === key ? preview.data : null;
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError('');
    try {
      await api.mutate('/leave/requests', { type, startDate, endDate, reason });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to submit leave.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <label className="form-label">
        Leave type
        <select required value={type} onChange={(e) => setType(e.target.value)}>
          {types.map((t) => (
            <option key={t.code} value={t.code}>
              {t.name}
            </option>
          ))}
        </select>
      </label>
      <div className="form-grid">
        <label className="form-label">
          Start date
          <input
            required
            type="date"
            min={today}
            max="2100-12-31"
            value={startDate}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label className="form-label">
          End date
          <input
            required
            type="date"
            min={startDate || today}
            max="2100-12-31"
            value={endDate}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
      </div>
      <div className="date-picker">
        <DayPicker
          mode="range"
          defaultMonth={asDate(today)}
          selected={{ from: asDate(startDate), to: asDate(endDate) }}
          disabled={{ before: asDate(today)! }}
          onSelect={(range) => {
            setStart(range?.from ? iso(range.from) : '');
            setEnd(range?.to ? iso(range.to) : '');
          }}
        />
      </div>
      {ready ? (
        <motion.div
          key={key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-success-soft border border-emerald-100 p-4 mb-5"
        >
          <p className="font-semibold text-sm">
            {ready.workingDays} working {ready.workingDays === 1 ? 'day' : 'days'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {dateLabel(startDate)} – {dateLabel(endDate)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Weekends and public holidays are excluded. Quota is used only after approval.
          </p>
        </motion.div>
      ) : startDate && endDate ? (
        <Notice
          message={preview.key === key ? preview.error : 'Calculating working days…'}
          success={preview.key !== key}
        />
      ) : (
        <p className="text-xs text-muted-foreground mb-5">
          Select dates to see your working-day total.
        </p>
      )}
      <label className="form-label">
        Reason
        <textarea
          required
          minLength={5}
          maxLength={1500}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="A little context for your HR team…"
        />
      </label>
      <Notice message={error} />
      <Button className="w-full mt-4" disabled={busy || !ready}>
        {busy ? 'Submitting…' : 'Submit leave request'}
      </Button>
    </form>
  );
}
