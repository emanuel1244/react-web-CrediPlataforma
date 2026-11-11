import { useMemo, useState } from 'react';
import { UserPlus, Pencil, Trash2, Ban, MoreVertical, Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Table, Tbody, Td, Thead, Tr } from '@/components/ui/Table';
import { DomainStatus } from '@/components/ui/StatusBadge';
import { FilterBar } from '@/components/ui/FilterBar';
import { Pagination } from '@/components/ui/Pagination';
import { AsyncBoundary, EmptyState } from '@/components/ui/States';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Field, TextInput, SelectInput } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { formatPercent } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';
import { usePagination } from '@/hooks/usePagination';
import { customerService } from '@/services/api';
import type { Customer, CustomerStatus } from '@/types/domain';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Todos los estados' },
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'REJECTED', label: 'Rechazado' },
  { value: 'BLOCKED', label: 'Bloqueado' },
];

function EditCustomerModal({
  customer,
  onClose,
  onSaved,
}: {
  customer: Customer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { notify } = useToast();
  const [form, setForm] = useState({
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    status: customer.status,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await customerService.update(customer.id, form);
      notify({ tone: 'success', title: 'Cliente actualizado', description: form.name });
      onSaved();
      onClose();
    } catch (e) {
      notify({ tone: 'danger', title: 'No se pudo guardar', description: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Editar cliente"
      description={customer.document}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre completo">
          {(id) => (
            <TextInput
              id={id}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Email">
          {(id) => (
            <TextInput
              id={id}
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Teléfono">
          {(id) => (
            <TextInput
              id={id}
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          )}
        </Field>
        <Field label="Estado" hint="Cambiar el estado queda registrado en auditoría.">
          {(id) => (
            <SelectInput
              id={id}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CustomerStatus }))}
            >
              <option value="ACTIVE">Activo</option>
              <option value="PENDING">Pendiente</option>
              <option value="REJECTED">Rechazado</option>
              <option value="BLOCKED">Bloqueado</option>
            </SelectInput>
          )}
        </Field>
      </div>
    </Modal>
  );
}

function RowActions({
  customer,
  onEdit,
  onBlock,
  onDelete,
}: {
  customer: Customer;
  onEdit: () => void;
  onBlock: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative flex justify-end">
      <button
        className="btn-ghost p-1.5"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Acciones para ${customer.name}`}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-20 w-44 overflow-hidden rounded-lg border border-ink-200 bg-white py-1 shadow-card-lg">
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
            >
              <Pencil className="h-4 w-4" /> Editar
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-warning-700 hover:bg-ink-50"
              onClick={() => {
                setOpen(false);
                onBlock();
              }}
            >
              <Ban className="h-4 w-4" /> {customer.status === 'BLOCKED' ? 'Desbloquear' : 'Bloquear'}
            </button>
            <button
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger-600 hover:bg-ink-50"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4" /> Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function AdminCustomers() {
  const { notify } = useToast();
  const { data, loading, error, reload } = useAsync(() => customerService.list(), []);
  const customers = data ?? [];

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customers.filter((c) => {
      const matchesText =
        !q || c.name.toLowerCase().includes(q) || c.document.toLowerCase().includes(q);
      const matchesStatus = status === 'ALL' || c.status === status;
      return matchesText && matchesStatus;
    });
  }, [customers, search, status]);

  const { page, setPage, pageSize, paged, total } = usePagination(filtered);
  const hasFilters = search !== '' || status !== 'ALL';

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await customerService.softDelete(deleting.id);
      notify({
        tone: 'success',
        title: 'Cliente eliminado',
        description: 'Soft-delete: el registro se conserva para auditoría.',
      });
      setDeleting(null);
      reload();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function toggleBlock(c: Customer) {
    try {
      const next = c.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
      await customerService.setStatus(c.id, next);
      notify({
        tone: next === 'BLOCKED' ? 'warning' : 'success',
        title: next === 'BLOCKED' ? 'Cliente bloqueado' : 'Cliente desbloqueado',
      });
      reload();
    } catch (e) {
      notify({ tone: 'danger', title: 'Error', description: (e as Error).message });
    }
  }

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle="Gestión de clientes del tenant"
        actions={
          <button className="btn-primary">
            <UserPlus className="h-4 w-4" />
            Nuevo cliente
          </button>
        }
      />
      <Card>
        <FilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Buscar por nombre o documento..."
          selects={[
            { value: status, onChange: setStatus, options: STATUS_OPTIONS, ariaLabel: 'Filtrar por estado' },
          ]}
          hasActiveFilters={hasFilters}
          onClear={() => {
            setSearch('');
            setStatus('ALL');
          }}
        />

        <AsyncBoundary
          loading={loading}
          error={error}
          data={filtered}
          onRetry={reload}
          loadingLabel="Cargando clientes..."
          empty={
            <EmptyState
              icon={<Users className="h-7 w-7" />}
              title="Sin resultados"
              description={
                hasFilters
                  ? 'Ningún cliente coincide con los filtros aplicados.'
                  : 'Aún no hay clientes registrados.'
              }
            />
          }
        >
          <Table>
            <Thead cols={['Cliente', 'Documento', 'Contacto', 'Préstamos', 'Puntualidad', 'Estado', '']} />
            <Tbody>
              {paged.map((c) => (
                <Tr key={c.id}>
                  <Td className="font-semibold text-ink-900">{c.name}</Td>
                  <Td>{c.document}</Td>
                  <Td>
                    <div className="text-ink-700">{c.email}</div>
                    <div className="text-xs text-ink-400">{c.phone}</div>
                  </Td>
                  <Td>{c.activeLoans}</Td>
                  <Td>
                    <span
                      className={
                        c.punctuality >= 0.9
                          ? 'font-semibold text-success-600'
                          : c.punctuality >= 0.7
                            ? 'font-semibold text-warning-600'
                            : 'font-semibold text-danger-600'
                      }
                    >
                      {formatPercent(c.punctuality)}
                    </span>
                  </Td>
                  <Td>
                    <DomainStatus status={c.status} />
                  </Td>
                  <Td>
                    <RowActions
                      customer={c}
                      onEdit={() => setEditing(c)}
                      onBlock={() => toggleBlock(c)}
                      onDelete={() => setDeleting(c)}
                    />
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </AsyncBoundary>
      </Card>

      {editing && (
        <EditCustomerModal customer={editing} onClose={() => setEditing(null)} onSaved={reload} />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Eliminar cliente"
        description={`¿Eliminar a ${deleting?.name}? No se borra físicamente: se marca como eliminado (soft-delete) y se conserva para auditoría.`}
        confirmLabel="Sí, eliminar"
        tone="danger"
        loading={busy}
      />
    </>
  );
}
