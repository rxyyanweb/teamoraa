import { Layers2 } from 'lucide-react';
export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${light ? 'text-white' : 'text-foreground'}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-teal-700 text-white">
        <Layers2 className="size-5" />
      </span>
      <span className="text-2xl font-bold tracking-tight">
        teamora<span className="text-success">.</span>
      </span>
    </div>
  );
}
