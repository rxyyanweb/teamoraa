'use client';
import { useState } from 'react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Notice } from './primitives';
export function DecisionForm({ path, onSaved }: { path: string; onSaved: () => void }) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  async function decide(action: string) {
    setBusy(action);
    setError('');
    try {
      await api.mutate(path + '/' + action, { comment });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save decision.');
    } finally {
      setBusy('');
    }
  }
  return (
    <div className="decision-box">
      <h3 className="font-semibold text-sm">Your decision</h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        The employee will see your comment with the outcome.
      </p>
      <label className="form-label">
        Decision comment
        <textarea
          minLength={3}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Explain the decision…"
          rows={3}
        />
      </label>
      <Notice message={error} />
      <div className="flex gap-3 mt-4">
        <Button
          disabled={!!busy || comment.trim().length < 3}
          onClick={() => void decide('approve')}
        >
          {busy === 'approve' ? 'Approving…' : 'Approve request'}
        </Button>
        <Button
          variant="outline"
          disabled={!!busy || comment.trim().length < 3}
          onClick={() => void decide('reject')}
        >
          {busy === 'reject' ? 'Rejecting…' : 'Reject request'}
        </Button>
      </div>
    </div>
  );
}
