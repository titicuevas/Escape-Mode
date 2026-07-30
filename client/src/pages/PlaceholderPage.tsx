export function PlaceholderPage({ title, phase }: { title: string; phase: number }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mt-3 text-ink-muted">
        Esta pantalla se implementará en la Fase {phase}. La ruta ya está protegida y conectada al
        layout principal.
      </p>
    </div>
  );
}
