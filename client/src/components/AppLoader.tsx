import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  Disc3,
  Gamepad2,
  Joystick,
  Sparkles,
  Trophy,
} from 'lucide-react';

type LoaderVariant =
  | 'disc'
  | 'controller'
  | 'xp'
  | 'trophy'
  | 'calendar'
  | 'joystick'
  | 'pixels';

const VARIANTS: LoaderVariant[] = [
  'disc',
  'controller',
  'xp',
  'trophy',
  'calendar',
  'joystick',
  'pixels',
];

const FLAVOR = [
  'Cargando partida…',
  'Sincronizando logros…',
  'Desbloqueando catálogo…',
  'Compilando saves…',
  'Respawneando datos…',
  'Cargando inventarios…',
  'Preparando el lobby…',
  'Calibrando el mando…',
  'Buscando ofertas épicas…',
  'Montando el calendario…',
  'Casi listo, un momento…',
  'Cargando pantallas de carga…',
];

function pickVariant(): LoaderVariant {
  return VARIANTS[Math.floor(Math.random() * VARIANTS.length)]!;
}

function pickFlavor(exclude?: string): string {
  const pool = exclude ? FLAVOR.filter((t) => t !== exclude) : FLAVOR;
  return pool[Math.floor(Math.random() * pool.length)] ?? FLAVOR[0]!;
}

function DiscLoader({ size }: { size: string }) {
  return (
    <div className={`relative ${size}`}>
      <div className="loader-disc absolute inset-0 rounded-full border-2 border-accent/40 bg-gradient-to-br from-accent/20 via-surface-elevated to-focus/20 shadow-[0_0_24px_-8px_rgba(94,234,212,0.55)]" />
      <div className="absolute inset-[28%] rounded-full border border-white/20 bg-surface" />
      <div className="absolute inset-[42%] rounded-full bg-accent/80" />
      <Disc3 className="absolute inset-0 m-auto size-[42%] text-accent/90" aria-hidden />
    </div>
  );
}

function ControllerLoader({ size, iconSize }: { size: string; iconSize: string }) {
  return (
    <div className={`relative flex items-center justify-center ${size}`}>
      <div className="absolute inset-0 rounded-2xl bg-accent/10 blur-md" />
      <Gamepad2 className={`loader-bounce relative text-accent ${iconSize}`} aria-hidden />
      <span className="loader-btn absolute left-[18%] top-[38%] size-1.5 rounded-full bg-danger" />
      <span className="loader-btn loader-btn-delay absolute right-[22%] top-[42%] size-1.5 rounded-full bg-success" />
    </div>
  );
}

function XpLoader({ compact, level }: { compact: boolean; level: number }) {
  return (
    <div className={`w-full ${compact ? 'max-w-[11rem]' : 'max-w-[14rem]'}`}>
      <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-ink-muted">
        <span>Nivel {level}</span>
        <span className="text-accent">XP</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-surface-muted">
        <div className="loader-xp h-full rounded-full bg-gradient-to-r from-accent-strong via-accent to-focus" />
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
        <Sparkles className="size-3.5 text-warning loader-pulse" aria-hidden />
        Subiendo de nivel…
      </div>
    </div>
  );
}

function TrophyLoader({ size, iconSize }: { size: string; iconSize: string }) {
  return (
    <div className={`relative flex items-center justify-center ${size}`}>
      <div className="loader-glow absolute inset-[-20%] rounded-full bg-warning/20" />
      <Trophy className={`loader-float relative text-warning ${iconSize}`} aria-hidden />
      <span className="loader-spark absolute -right-1 top-0 size-2 rounded-full bg-accent" />
      <span className="loader-spark loader-spark-delay absolute -left-0.5 bottom-1 size-1.5 rounded-full bg-focus" />
    </div>
  );
}

function CalendarLoader({ size, iconSize }: { size: string; iconSize: string }) {
  return (
    <div className={`relative ${size}`}>
      <div className="absolute inset-0 rounded-full border-2 border-accent/15" />
      <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-accent border-r-accent/50" />
      <div className="absolute inset-[18%] rounded-full border border-dashed border-focus/35 animate-[spin_2.8s_linear_infinite_reverse]" />
      <CalendarDays className={`absolute inset-0 m-auto text-accent ${iconSize}`} aria-hidden />
    </div>
  );
}

function JoystickLoader({ size, iconSize }: { size: string; iconSize: string }) {
  return (
    <div className={`relative flex items-center justify-center ${size}`}>
      <div className="absolute bottom-0 h-1/2 w-3/5 rounded-full bg-white/5" />
      <Joystick className={`loader-wobble relative text-focus ${iconSize}`} aria-hidden />
    </div>
  );
}

function PixelsLoader({ compact }: { compact: boolean }) {
  const bars = compact ? 5 : 7;
  return (
    <div className="flex items-end gap-1.5" style={{ height: compact ? 36 : 48 }}>
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className="loader-pixel w-2 rounded-sm bg-accent sm:w-2.5"
          style={{ animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}

function LoaderVisual({
  variant,
  compact,
  level,
}: {
  variant: LoaderVariant;
  compact: boolean;
  level: number;
}) {
  const size = compact ? 'size-10' : 'size-14';
  const iconSize = compact ? 'size-5' : 'size-7';

  switch (variant) {
    case 'disc':
      return <DiscLoader size={size} />;
    case 'controller':
      return <ControllerLoader size={size} iconSize={iconSize} />;
    case 'xp':
      return <XpLoader compact={compact} level={level} />;
    case 'trophy':
      return <TrophyLoader size={size} iconSize={iconSize} />;
    case 'joystick':
      return <JoystickLoader size={size} iconSize={iconSize} />;
    case 'pixels':
      return <PixelsLoader compact={compact} />;
    case 'calendar':
    default:
      return <CalendarLoader size={size} iconSize={compact ? 'size-4' : 'size-5'} />;
  }
}

export function AppLoader({
  label,
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  const variant = useMemo(() => pickVariant(), []);
  const level = useMemo(() => Math.floor(Math.random() * 40) + 12, []);
  const [flavor, setFlavor] = useState(() => label ?? pickFlavor());

  useEffect(() => {
    if (label) {
      setFlavor(label);
      return;
    }
    const id = window.setInterval(() => {
      setFlavor((prev) => pickFlavor(prev));
    }, 2400);
    return () => window.clearInterval(id);
  }, [label]);

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${compact ? 'py-8' : 'py-16'}`}
      role="status"
      aria-live="polite"
      aria-label={flavor}
      data-loader={variant}
    >
      <LoaderVisual variant={variant} compact={compact} level={level} />
      <p className="min-h-5 text-center text-sm text-ink-muted transition-opacity">{flavor}</p>
      {!label ? (
        <p className="text-[10px] uppercase tracking-[0.2em] text-ink-muted/60">Escape Mode</p>
      ) : null}
    </div>
  );
}
