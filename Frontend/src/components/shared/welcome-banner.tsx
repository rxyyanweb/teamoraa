import Link from 'next/link';
import { ArrowRight, HeartHandshake } from 'lucide-react';
import { Button } from '@/components/ui/button';
export function WelcomeBanner({
  title,
  description,
  href,
  action,
}: {
  title: string;
  description: string;
  href: string;
  action: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#143e39] px-7 py-7 text-white sm:px-9">
      <div className="relative z-10 max-w-lg">
        <span className="text-[10px] font-semibold tracking-[.16em] text-teal-200">
          GOOD PEOPLE. GREAT POSSIBILITIES.
        </span>
        <h2 className="mt-3 text-2xl font-medium tracking-tight">{title}</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-teal-100/70">{description}</p>
        <Button
          asChild
          variant="outline"
          size="sm"
          className="mt-5 border-white/20 bg-white/10 text-white hover:bg-white/20"
        >
          <Link href={href}>
            {action}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
      <HeartHandshake
        className="absolute -right-5 bottom-1 size-56 rotate-[-12deg] text-teal-300/10 sm:right-10"
        strokeWidth={0.8}
      />
    </section>
  );
}
