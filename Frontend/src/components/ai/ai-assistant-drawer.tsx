'use client';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, LoaderCircle, RotateCcw } from 'lucide-react';
import { aiErrorMessage } from '@/services/ai-errors';
import { api } from '@/services/api';
import type { Role } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Drawer } from '@/components/workforce/drawer';
type Message = { role: 'user' | 'assistant'; content: string; sources?: string[]; isAiGenerated?: boolean };
const prompts: Record<Role, string[]> = {
  employee: [
    'What is my leave balance?',
    'How many times was I late this month?',
    'Mujhe chutti ka procedure bata dein.',
  ],
  hr: ['Who arrived late today?', 'Who is on leave today?', 'Summarize attendance this week.'],
  admin: [
    'What is our monthly payroll cost?',
    'Show headcount by department.',
    'Summarize company attendance.',
  ],
};
function ReadableMessage({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap">
      {text
        .split(/(\*\*[^*]+\*\*)/g)
        .map((part, i) =>
          part.startsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
        )}
    </div>
  );
}
export function AiAssistantDrawer({ userRole }: { userRole: Role }) {
  const [open, setOpen] = useState(false),
    [messages, setMessages] = useState<Message[]>([]),
    [input, setInput] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [retry, setRetry] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (open) end.current?.scrollIntoView({ behavior: 'instant', block: 'nearest' });
  }, [messages, busy, open]);
  async function send(query = input, retrying = false) {
    const text = query.trim();
    if (!text || busy) return;
    const next: Message[] = retrying ? messages : [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError('');
    setRetry(text);
    try {
      const data = await api.mutate<{ response: string; toolsUsed: string[]; isAiGenerated: boolean }>('/ai/chat', {
        messages: next
          .slice(-7)
          .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', content: m.content })),
      });
      setMessages([
        ...next,
        { role: 'assistant', content: data.response, sources: data.toolsUsed, isAiGenerated: data.isAiGenerated },
      ]);
      setRetry('');
    } catch (e) {
      setError(aiErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="ai-launcher" onClick={() => setOpen(true)} aria-label="Open Teamora AI">
        <Sparkles size={17} />
        Ask Teamora
      </button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Teamora AI"
        description="A little help with your workday. English or Roman Urdu."
      >
        <div className="ai-prompts">
          {prompts[userRole].map((p) => (
            <button key={p} disabled={busy} onClick={() => void send(p)}>
              {p}
            </button>
          ))}
        </div>
        {!messages.length && (
          <div className="empty-state">
            <Sparkles size={28} className="text-primary mb-4" />
            <h3 className="font-semibold">What can I help you with?</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Ask about your work, time off, or company policies.
            </p>
          </div>
        )}
        <div role="log" aria-label="Conversation" aria-live="polite">
          {messages.map((m, i) => {
            return (
              <article
                key={i}
                className={`chat-message min-w-0 [overflow-wrap:anywhere] ${m.role === 'user' ? 'chat-user' : ''}`}
              >
                <p className="chat-label">{m.role === 'user' ? 'You' : m.isAiGenerated === false ? 'Teamora · Privacy policy' : 'Teamora · AI-generated'}</p>
                <ReadableMessage text={m.content} />
                {!!m.sources?.length && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Based on your authorized company records.
                  </p>
                )}
              </article>
            );
          })}
        </div>
        {busy && (
          <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground py-5">
            <LoaderCircle size={16} className="animate-spin" />
            Checking your records…
          </p>
        )}
        {error && (
          <div className="notice notice-error min-w-0 [overflow-wrap:anywhere]" role="alert">
            {error}
            <Button
              className="mt-3"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void send(retry, true)}
            >
              <RotateCcw size={14} />
              Try again
            </Button>
          </div>
        )}
        <div ref={end} />
        <form
          className="chat-composer"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            aria-label="Message Teamora AI"
            placeholder="Ask a question…"
            value={input}
            maxLength={2000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={busy || !input.trim()}
          >
            <Send size={17} />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-3">
          AI can make mistakes. Check important details in your records.
        </p>
      </Drawer>
    </>
  );
}
