import { cn } from '@/lib/cn';
import type { ReactNode } from 'react';

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-200">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export function Thead({ cols }: { cols: string[] }) {
  return (
    <thead className="bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-500">
      <tr>
        {cols.map((c) => (
          <th key={c} className="whitespace-nowrap px-4 py-3">
            {c}
          </th>
        ))}
      </tr>
    </thead>
  );
}

export function Tbody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-ink-100 bg-white">{children}</tbody>;
}

export function Tr({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn('transition-colors', onClick && 'cursor-pointer hover:bg-ink-50')}
    >
      {children}
    </tr>
  );
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('whitespace-nowrap px-4 py-3 text-ink-700', className)}>{children}</td>;
}
