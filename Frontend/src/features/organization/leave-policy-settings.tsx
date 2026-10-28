'use client';

import { useState } from 'react';
import { useResource } from '@/hooks/use-resource';
import { api } from '@/services/api';
import type { LeaveType, LeavePolicy } from '@/types/workforce';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Feedback, Loading } from '@/components/shared/feedback';
import { Plus, Trash2, Calendar, ShieldCheck, SunMedium } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function LeavePolicySettings() {
  const {
    data,
    error: loadError,
    loading,
    reload,
  } = useResource<{ policy: LeavePolicy }>('/organization/leave-policy');
  const [types, setTypes] = useState<LeaveType[] | null>(null);
  const [holidays, setHolidays] = useState<{ date: string; name: string }[] | null>(null);

  // New leave type form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newQuota, setNewQuota] = useState('10');
  const [isUnlimited, setIsUnlimited] = useState(false);

  // New holiday form state
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayName, setHolidayName] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Synchronize state once loaded
  const currentTypes = types ?? data?.policy.types ?? [];
  const currentHolidays = holidays ?? data?.policy.holidays ?? [];

  if (loading) return <Loading text="Loading leave policy…" />;
  if (loadError || !data) {
    return (
      <div className="space-y-4">
        <Feedback message={loadError} />
        <Button onClick={() => void reload()}>Try again</Button>
      </div>
    );
  }

  function updateTypeQuota(code: string, quota: number | null) {
    setTypes(currentTypes.map((t) => (t.code === code ? { ...t, annualQuota: quota } : t)));
  }

  function toggleTypeActive(code: string) {
    setTypes(currentTypes.map((t) => (t.code === code ? { ...t, active: !t.active } : t)));
  }

  function addLeaveType(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;
    const formattedCode = newCode
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_');
    if (currentTypes.some((t) => t.code === formattedCode)) {
      setError(`Leave type code "${formattedCode}" already exists.`);
      return;
    }
    setError('');
    const newEntry: LeaveType = {
      code: formattedCode,
      name: newName.trim(),
      annualQuota: isUnlimited ? null : Math.max(0, parseInt(newQuota, 10) || 0),
      active: true,
    };
    setTypes([...currentTypes, newEntry]);
    setNewCode('');
    setNewName('');
    setNewQuota('10');
    setIsUnlimited(false);
  }

  function addHoliday(e: React.FormEvent) {
    e.preventDefault();
    if (!holidayDate || !holidayName.trim()) return;
    if (currentHolidays.some((h) => h.date === holidayDate)) {
      setError(`Holiday on ${holidayDate} already exists.`);
      return;
    }
    setError('');
    const updated = [...currentHolidays, { date: holidayDate, name: holidayName.trim() }].sort(
      (a, b) => a.date.localeCompare(b.date),
    );
    setHolidays(updated);
    setHolidayDate('');
    setHolidayName('');
  }

  function removeHoliday(date: string) {
    setHolidays(currentHolidays.filter((h) => h.date !== date));
  }

  async function savePolicy() {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await api.mutate(
        '/organization/leave-policy',
        {
          types: currentTypes,
          holidays: currentHolidays,
        },
        'PATCH',
      );
      setSuccess('Leave policy and public holidays saved successfully.');
      void reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save leave policy.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">COMPANY TIME-OFF RULES</p>
          <h1 className="page-heading">Leave policy & public holidays</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure yearly leave quotas, active time-off categories, and recognized official
            holidays.
          </p>
        </div>
        <Button onClick={savePolicy} disabled={busy}>
          {busy ? 'Saving policy…' : 'Save all policy changes'}
        </Button>
      </div>

      <Feedback message={error} />
      <Feedback message={success} success />

      {/* Leave Types & Quotas */}
      <Card>
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2">
              <ShieldCheck className="size-4 text-success" />
              Leave types & yearly quotas
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Employees can only apply for active leave types. Deactivated types retain history.
            </p>
          </div>
          <Badge>{currentTypes.filter((t) => t.active).length} active types</Badge>
        </div>

        <div className="mt-5 divide-y">
          {currentTypes.map((type) => (
            <div
              key={type.code}
              className="py-4 flex flex-wrap items-center justify-between gap-4 first:pt-0 last:pb-0"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">{type.name}</span>
                  <span className="text-[11px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {type.code}
                  </span>
                  {!type.active && (
                    <Badge className="bg-muted text-muted-foreground">Deactivated</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {type.annualQuota === null
                    ? 'Unlimited leave quota (unpaid)'
                    : `${type.annualQuota} working days per calendar year`}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Annual quota:</label>
                  {type.annualQuota === null ? (
                    <span className="text-xs font-semibold px-2 py-1 bg-muted rounded text-muted-foreground">
                      Unlimited
                    </span>
                  ) : (
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={type.annualQuota}
                      onChange={(e) =>
                        updateTypeQuota(type.code, Math.max(0, parseInt(e.target.value, 10) || 0))
                      }
                      className="w-20 h-9 rounded-md border px-2 text-xs font-medium text-center focus:ring-1 focus:ring-emerald-500"
                    />
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer ml-3 select-none">
                  <input
                    type="checkbox"
                    checked={type.active}
                    onChange={() => toggleTypeActive(type.code)}
                    className="accent-emerald-600 size-4 rounded"
                  />
                  <span>Active</span>
                </label>
              </div>
            </div>
          ))}
        </div>

        {/* Add custom leave type form */}
        <div className="mt-6 border-t pt-5">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
            Add custom leave category
          </p>
          <form onSubmit={addLeaveType} className="grid gap-3 sm:grid-cols-4 items-end">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Type name</label>
              <input
                type="text"
                placeholder="e.g. Paternity leave"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full h-9 rounded-md border px-3 text-xs"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Code identifier</label>
              <input
                type="text"
                placeholder="e.g. paternity"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                className="w-full h-9 rounded-md border px-3 text-xs font-mono"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Days per year</label>
                <label className="text-[11px] text-muted-foreground flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isUnlimited}
                    onChange={(e) => setIsUnlimited(e.target.checked)}
                    className="accent-emerald-600"
                  />
                  Unlimited
                </label>
              </div>
              <input
                type="number"
                disabled={isUnlimited}
                min={0}
                max={365}
                value={newQuota}
                onChange={(e) => setNewQuota(e.target.value)}
                className="w-full h-9 rounded-md border px-3 text-xs disabled:opacity-50"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" className="h-9">
              <Plus className="size-4 mr-1" /> Add category
            </Button>
          </form>
        </div>
      </Card>

      {/* Public Holidays */}
      <Card>
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            <h2 className="font-semibold text-base flex items-center gap-2">
              <SunMedium className="size-4 text-success" />
              Public holidays
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Public holidays are automatically excluded from leave deductions and attendance
              obligations.
            </p>
          </div>
          <Badge>{currentHolidays.length} holidays</Badge>
        </div>

        {/* Add Holiday Form */}
        <form
          onSubmit={addHoliday}
          className="mt-5 grid gap-3 sm:grid-cols-[160px_1fr_auto] items-end"
        >
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Holiday date</label>
            <input
              type="date"
              aria-label="Holiday date"
              value={holidayDate}
              onChange={(e) => setHolidayDate(e.target.value)}
              className="w-full h-9 rounded-md border px-3 text-xs"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Holiday name</label>
            <input
              type="text"
              aria-label="Holiday name"
              placeholder="e.g. Independence Day, Eid-ul-Fitr, Pakistan Day"
              value={holidayName}
              onChange={(e) => setHolidayName(e.target.value)}
              className="w-full h-9 rounded-md border px-3 text-xs"
              required
            />
          </div>
          <Button type="submit" variant="outline" size="sm" className="h-9">
            <Plus className="size-4 mr-1" /> Add holiday
          </Button>
        </form>

        {/* Holidays List */}
        <div className="mt-6">
          {currentHolidays.length === 0 ? (
            <div className="text-center py-8 bg-muted rounded-xl border border-dashed text-xs text-muted-foreground">
              <Calendar className="size-8 mx-auto mb-2 text-muted-foreground stroke-1" />
              No public holidays added yet. Add company holidays so working days calculate
              accurately.
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden divide-y text-xs">
              {currentHolidays.map((holiday) => (
                <div
                  key={holiday.date}
                  className="px-4 py-3 flex items-center justify-between hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-foreground bg-success-soft text-success px-2 py-1 rounded">
                      {holiday.date}
                    </span>
                    <span className="font-medium text-foreground">{holiday.name}</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeHoliday(holiday.date)}
                    className="text-muted-foreground hover:text-danger h-8 px-2"
                    aria-label={`Remove ${holiday.name}`}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="flex justify-end pt-2">
        <Button onClick={savePolicy} disabled={busy}>
          {busy ? 'Saving policy…' : 'Save all policy changes'}
        </Button>
      </div>
    </div>
  );
}
