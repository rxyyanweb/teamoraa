import Link from 'next/link';
import { Sparkles, Check, ArrowRight, Sprout } from 'lucide-react';
import { Card } from '@/components/ui/card';
export function GettingStarted({
  steps,
}: {
  steps: { label: string; description: string; done: boolean; href: string }[];
}) {
  return (
    <div className="space-y-5">
      <Card>
        <div className="mb-5 flex items-center gap-2">
          <Sparkles className="size-4 text-warning" />
          <h2 className="text-sm font-semibold">Make yourself at home</h2>
        </div>
        <div className="space-y-5">
          {steps.map((step) => (
            <Link href={step.href} key={step.label} className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border ${step.done ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-200 text-muted-foreground'}`}
              >
                <Check className="size-3" />
              </span>
              <div>
                <p className="text-xs font-semibold">{step.label}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {step.description}
                </p>
              </div>
              <ArrowRight className="mt-1 ml-auto size-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </Card>
      <div className="flex gap-3 rounded-xl border border-[#e6eadd] bg-[#f2f5eb] p-4">
        <Sprout className="mt-1 size-5 shrink-0 text-[#789367]" />
        <p className="text-xs leading-6 text-[#68765c]">
          Small steps, stronger teams. A thoughtful workplace starts with the everyday details.
        </p>
      </div>
    </div>
  );
}
