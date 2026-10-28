'use client';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, Sparkles } from 'lucide-react';
import { useResource } from '@/hooks/use-resource';
import type { PersonalLeave } from '@/types/workforce';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/workforce/drawer';
import {
  PageHeading,
  Panel,
  Calendar,
  MonthNav,
  SelectFilter,
  LoadState,
  Notice,
  label,
  queryString,
  Status,
  Empty,
} from '@/components/workforce/primitives';
import { LeaveTable, LeaveDetailsDrawer } from './leave-details';
import { LeaveApplication } from './leave-application';
import { SmartLeaveModal } from './smart-leave-modal';
export function PersonalLeavePage() {
  const [month, setMonth] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [apply, setApply] = useState(false);
  const [smartModalOpen, setSmartModalOpen] = useState(false);
  const [initialDraft, setInitialDraft] = useState<
    { type: string; startDate: string; endDate: string; reason: string } | undefined
  >(undefined);
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');
  const resource = useResource<PersonalLeave>('/leave/me?' + queryString({ month, status, page }));
  const data = resource.data;
  return (
    <>
      <PageHeading
        title="My leave"
        description="Make time for what matters. Plan your time away and keep track of every request."
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={!data || !data.types.length}
              onClick={() => setSmartModalOpen(true)}
              className="gap-1.5 border-emerald-500/40 text-success hover:bg-emerald-500/10 cursor-pointer"
            >
              <Sparkles size={14} className="text-warning" />
              Smart Apply (AI)
            </Button>
            <Button
              disabled={!data || !data.types.length}
              onClick={() => {
                setInitialDraft(undefined);
                setApply(true);
              }}
            >
              <Plus size={16} />
              Apply leave
            </Button>
          </div>
        }
      />
      <Notice message={notice} success />
      {!data ? (
        <LoadState error={resource.error} retry={resource.reload} />
      ) : (
        <>
          <div className="balance-grid">
            {data.balances.map((b, i) => (
              <motion.div
                className="balance-card"
                key={b.code}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <p className="text-sm font-medium">
                  {b.name}
                  {!b.active && <span className="text-xs text-muted-foreground"> · Inactive</span>}
                </p>
                <p className="balance-number">{b.available ?? '∞'}</p>
                <p className="text-xs text-muted-foreground">
                  {b.available === null ? 'Unlimited leave' : 'days available'} · {data.year}
                </p>
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: b.annualQuota ? Math.min(b.used / b.annualQuota, 1) : 0 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  {b.used} used{b.annualQuota !== null ? ' of ' + b.annualQuota : ''} · {b.pending}{' '}
                  pending
                </p>
              </motion.div>
            ))}
          </div>
          <Panel
            title="Your leave calendar"
            description="Approved and pending working days. Weekends and holidays do not consume leave."
            action={
              <MonthNav
                month={data.month}
                onChange={(m) => {
                  setMonth(m);
                  setPage(1);
                }}
              />
            }
          >
            <Calendar
              month={data.month}
              days={data.calendar.map((d) => ({ ...d, caption: d.typeName }))}
              onDay={(date) => {
                const day = data.calendar.find((d) => d.date === date);
                if (day) setSelected(day.requestId);
                else setNotice('No pending or approved leave on ' + date + '.');
              }}
            />
            <div className="flex gap-2 px-5 pb-5">
              <Status value="approved" />
              <Status value="pending" />
            </div>
          </Panel>
          <Panel
            title={'Request history · ' + data.year}
            description="Pending leave does not reserve quota. Approved requests can be cancelled before their start date."
          >
            <div className="toolbar">
              <SelectFilter
                label="All statuses"
                value={status}
                options={['pending', 'approved', 'rejected', 'cancelled'].map((value) => ({
                  value,
                  label: label(value),
                }))}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                }}
              />
            </div>
            <LeaveTable data={data} onPage={setPage} onSelect={setSelected} />
          </Panel>
          <Drawer
            open={apply}
            onClose={() => setApply(false)}
            title="Apply for leave"
            description="Choose your dates. We’ll calculate the working days for you."
          >
            {data.types.length ? (
              <LeaveApplication
                key={JSON.stringify(initialDraft ?? {})}
                types={data.types}
                today={data.today}
                initialDraft={initialDraft}
                onSaved={() => {
                  setApply(false);
                  setInitialDraft(undefined);
                  setNotice('Leave request submitted. Your HR team will review it.');
                  resource.reload();
                }}
              />
            ) : (
              <Empty
                title="No active leave types"
                description="Ask your administrator to configure leave types."
              />
            )}
          </Drawer>
          <SmartLeaveModal
            open={smartModalOpen}
            onClose={() => setSmartModalOpen(false)}
            onApplyDraft={(draft) => {
              setInitialDraft(draft);
              setApply(true);
            }}
          />
        </>
      )}
      <LeaveDetailsDrawer
        id={selected}
        onClose={() => setSelected('')}
        onSaved={() => {
          setSelected('');
          setNotice('Request updated. Your leave balance has been refreshed.');
          resource.reload();
        }}
      />
    </>
  );
}
