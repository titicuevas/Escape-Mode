/**
 * Con registerType autoUpdate el SW se actualiza solo.
 * Este componente solo avisa si el navegador dispara un evento de controlador nuevo.
 */
import { useEffect, useState } from 'react';

export function PwaUpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onControllerChange = () => setShow(true);
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    void navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            setShow(true);
          }
        });
      });
    });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      className="fixed bottom-24 left-3 right-3 z-50 mx-auto max-w-md rounded-xl border border-accent/30 bg-surface-elevated p-3 shadow-xl lg:bottom-6"
    >
      <p className="text-sm">Hay una nueva versión disponible.</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="min-h-11 flex-1 rounded-lg bg-accent/20 px-3 text-sm text-accent"
          onClick={() => window.location.reload()}
        >
          Actualizar
        </button>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-white/10 px-3 text-sm text-ink-muted"
          onClick={() => setShow(false)}
        >
          Ahora no
        </button>
      </div>
    </div>
  );
}
