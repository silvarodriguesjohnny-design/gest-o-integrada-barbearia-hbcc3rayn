import { ManualTenantDialog } from '@/components/admin/ManualTenantDialog'

export function NewPendingTenantDialog({
  onCreated,
  open,
  onOpenChange,
}: {
  onCreated: () => void
  open?: boolean
  onOpenChange?: (v: boolean) => void
}) {
  return <ManualTenantDialog onCreated={onCreated} open={open} onOpenChange={onOpenChange} />
}
