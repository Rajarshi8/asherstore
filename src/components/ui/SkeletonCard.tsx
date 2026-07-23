export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-white/10 bg-zinc-950/80 p-3">
      <div className="aspect-square w-full rounded-lg bg-zinc-900/80" />
      <div className="mt-3 h-3 w-2/3 rounded bg-zinc-900" />
      <div className="mt-1.5 h-2.5 w-1/2 rounded bg-zinc-900" />
      <div className="mt-3 h-8 rounded-lg bg-zinc-900" />
    </div>
  );
}
