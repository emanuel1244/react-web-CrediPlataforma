import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';

/** Pantalla provisional para rutas del spec aún no maquetadas. */
export function Placeholder({ title }: { title: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-brand-50 text-brand-600">
          <Construction className="h-7 w-7" />
        </span>
        <p className="text-base font-semibold text-ink-900">Pantalla en construcción</p>
        <p className="max-w-sm text-sm text-ink-500">
          Esta vista está definida en el spec y se implementará en la fase correspondiente del plan
          de tareas.
        </p>
      </Card>
    </>
  );
}
