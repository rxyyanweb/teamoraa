import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
export function Feedback({ message, success = false }: { message: string; success?: boolean }) {
  if (!message) return null;
  const Icon = success ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={success ? 'status' : 'alert'}
      className={`flex gap-2 rounded-lg border p-3 text-sm ${success ? 'border-teal-200 bg-success-soft text-success' : 'border-red-200 bg-danger-soft text-danger'}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}
export function Loading({ text = 'Loading your workspace…' }: { text?: string }) {
  return (
    <div
      className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground"
      role="status"
    >
      <LoaderCircle className="size-5 animate-spin" />
      {text}
    </div>
  );
}
