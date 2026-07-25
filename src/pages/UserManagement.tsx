import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Loader2, Mail, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { inviteUser, getInvitations, getAllProfiles } from '@/services/invitations'
import { getAllTenants } from '@/services/super-admin'

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  operator: 'Operador',
  viewer: 'Visualizador',
}
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-accent text-white',
  operator: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-700',
}
const STATUS_LABELS: Record<string, string> = {
  email_sent: 'Email Enviado',
  pending: 'Pendente',
  completed: 'Completo',
  failed: 'Falhou',
}
const STATUS_COLORS: Record<string, string> = {
  email_sent: 'bg-blue-100 text-blue-700',
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
}

export default function UserManagement() {
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('operator')
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [inviting, setInviting] = useState(false)
  const [profiles, setProfiles] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [tenants, setTenants] = useState<any[]>([])

  const loadData = useCallback(async () => {
    const [profilesRes, invitationsRes, tenantsRes] = await Promise.all([
      getAllProfiles(),
      getInvitations(),
      getAllTenants(),
    ])
    setProfiles(profilesRes.data || [])
    setInvitations(invitationsRes.data || [])
    setTenants(tenantsRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      toast({ title: 'Erro', description: 'Email inválido.', variant: 'destructive' })
      return
    }
    setInviting(true)
    const { data, error } = await inviteUser(email, role, tenantId || null)
    setInviting(false)
    if (error) {
      toast({
        title: 'Erro ao convidar',
        description: error.message || 'Erro desconhecido.',
        variant: 'destructive',
      })
    } else {
      toast({ title: 'Sucesso!', description: `Convite enviado para ${email}` })
      setEmail('')
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-accent" /> Gerenciar Usuários
        </h1>
        <p className="text-muted-foreground mt-1">
          Convide novos usuários e gerencie acessos do sistema.
        </p>
      </div>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="font-serif text-xl flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent" /> Convidar Novo Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleInvite} className="grid gap-4 md:grid-cols-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold">Email</Label>
              <Input
                type="email"
                placeholder="novo@usuario.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Função</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operador</SelectItem>
                  <SelectItem value="viewer">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Barbearia</Label>
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar..." />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="md:col-span-4 h-12" disabled={inviting}>
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Mail className="mr-2 h-4 w-4" /> Enviar Convite
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="font-serif text-xl">Usuários Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Barbearia</TableHead>
                <TableHead>Super Admin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                profiles.map((p) => (
                  <TableRow key={p.id} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-medium">{p.full_name || '-'}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[p.role] || ''} variant="secondary">
                        {ROLE_LABELS[p.role] || p.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.tenant?.name || '-'}
                    </TableCell>
                    <TableCell>{p.is_super_admin ? 'Sim' : 'Não'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="hover:shadow-elevation transition-shadow">
        <CardHeader className="border-b bg-muted/20 pb-4">
          <CardTitle className="font-serif text-xl">Histórico de Convites</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhum convite enviado ainda.
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((inv) => (
                  <TableRow key={inv.id} className="hover:bg-muted/30">
                    <TableCell className="pl-6 font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[inv.role] || ''} variant="secondary">
                        {ROLE_LABELS[inv.role] || inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[inv.status] || ''} variant="secondary">
                        {STATUS_LABELS[inv.status] || inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-right text-sm text-muted-foreground">
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
