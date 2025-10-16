import React, { createContext, useContext, useMemo, useState } from 'react';
import * as RToast from '@radix-ui/react-toast';

export type ToastVariant = 'info' | 'success' | 'error' | 'warning';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // ms
}

interface ToastItem extends Required<Omit<ToastOptions, 'duration'>> {
  id: string;
  duration: number;
}

interface ToastContextValue {
  show: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function Toaster({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const ctx = useMemo<ToastContextValue>(() => ({
    show: (opts: ToastOptions) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [
        ...prev,
        {
          id,
          title: opts.title ?? '',
          description: opts.description ?? '',
          variant: opts.variant ?? 'info',
          duration: opts.duration ?? 4000,
        },
      ]);
    },
  }), []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={ctx}>
      <RToast.Provider swipeDirection="right">
        {children}
        {toasts.map((t) => (
          <RToast.Root
            key={t.id}
            open
            onOpenChange={(open) => {
              if (!open) remove(t.id);
            }}
            duration={t.duration}
            className={[
              'pointer-events-auto rounded-md shadow-lg border px-4 py-3 mb-2 w-[360px] bg-card text-card-foreground',
              t.variant === 'success' && 'border-green-600',
              t.variant === 'error' && 'border-red-600',
              t.variant === 'warning' && 'border-yellow-600',
              t.variant === 'info' && 'border-blue-600',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {t.title && (
              <RToast.Title className="font-semibold mb-1">
                {t.title}
              </RToast.Title>
            )}
            {t.description && (
              <RToast.Description className="text-sm opacity-90 whitespace-pre-line">
                {t.description}
              </RToast.Description>
            )}
          </RToast.Root>
        ))}
        <RToast.Viewport className="fixed bottom-4 right-4 z-[9999] flex flex-col outline-none" />
      </RToast.Provider>
    </ToastContext.Provider>
  );
}
