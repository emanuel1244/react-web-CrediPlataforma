import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  children: (id: string) => ReactNode;
}

/** Campo de formulario con label asociado por id (accesibilidad). */
export function Field({ label, hint, error, children }: FieldProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="mt-1 text-xs text-danger-600">{error}</p>
      ) : (
        hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({
  id,
  invalid,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input id={id} className={cn('input', invalid && 'border-danger-500')} {...props} />;
}

export function SelectInput({
  id,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select id={id} className="input" {...props}>
      {children}
    </select>
  );
}

export function TextArea({ id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea id={id} className="input min-h-[80px]" {...props} />;
}
