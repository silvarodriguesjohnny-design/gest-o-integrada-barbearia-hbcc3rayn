import { ManualTenantDialog } from '@/components/admin/ManualTenantDialog'

export function NewPendingTenantDialog({ onCreated }: { onCreated: () => void }) {
  return <ManualTenantDialog onCreated={onCreated} />
}
