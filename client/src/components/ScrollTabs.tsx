import type { ReactNode } from 'react';

export function ScrollTabs({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="scroll-tabs" role="tablist" aria-label={label}>
      {children}
    </div>
  );
}

export function TabButton({
  selected,
  children,
  onClick,
}: {
  selected: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={[
        'shrink-0 rounded-lg px-3 py-2.5 text-sm whitespace-nowrap min-h-11',
        selected ? 'bg-accent/20 text-accent' : 'border border-white/10 text-ink-muted',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
