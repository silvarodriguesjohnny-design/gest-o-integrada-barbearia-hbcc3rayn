import { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Package, Plus, Pencil, Trash2, Loader2, Upload, Image as ImageIcon } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/services/products'
import { supabase } from '@/lib/supabase/client'
import type { Product } from '@/types'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Produtos() {
  const { toast } = useToast()
  const { tenant } = useAuth()
  const tenantId = tenant?.id || ''

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Campos do formulário (criar/editar)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('Geral')
  const [description, setDescription] = useState('')
  const [active, setActive] = useState(true)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadProducts = () => {
    setLoading(true)
    getProducts().then(({ data, error }) => {
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        setProducts(data || [])
      }
      setLoading(false)
    })
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setName('')
    setPrice('')
    setCategory('Geral')
    setDescription('')
    setActive(true)
    setImageUrl(null)
    setShowForm(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setName(p.name)
    setPrice(String(p.price))
    setCategory(p.category || 'Geral')
    setDescription(p.description || '')
    setActive(p.active ?? true)
    setImageUrl(p.image_url ?? null)
    setShowForm(true)
  }

  const handleUpload = async (file: File) => {
    if (!tenantId) return
    setUploading(true)
    const ext = file.name.split('.').pop() || 'png'
    const path = `${tenantId}/${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: false })
    setUploading(false)
    if (error) {
      toast({ title: 'Erro no upload', description: error.message, variant: 'destructive' })
      return
    }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    setImageUrl(data.publicUrl)
    toast({ title: 'Imagem enviada!' })
  }

  const handleSave = async () => {
    if (!name.trim() || !price) {
      toast({ title: 'Preencha nome e preço', variant: 'destructive' })
      return
    }
    setSaving(true)
    const payload = {
      name: name.trim(),
      price: Number(price),
      description: description.trim() || undefined,
      category: category.trim() || 'Geral',
      active,
      image_url: imageUrl || null,
    }
    const { error } = editing
      ? await updateProduct(editing.id, payload)
      : await createProduct(payload)
    setSaving(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      return
    }
    toast({
      title: editing ? 'Produto atualizado!' : 'Produto criado!',
      description: `${name} foi ${editing ? 'atualizado' : 'adicionado'}.`,
    })
    setShowForm(false)
    loadProducts()
  }

  const handleDelete = async (id: string) => {
    setSaving(true)
    const { error } = await deleteProduct(id)
    setSaving(false)
    setDeletingId(null)
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Produto excluído' })
    loadProducts()
  }

  const activeCount = products.filter((p) => p.active !== false).length

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Package className="h-7 w-7 text-accent" /> Produtos
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre produtos que seus clientes podem levar para casa ao agendar online.
          </p>
        </div>
        <Button variant="amber" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo Produto
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase font-semibold">
                Produtos Cadastrados
              </p>
              <Package className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{products.length}</p>
          </CardContent>
        </Card>
        <Card className="border-success/40 hover:shadow-md transition-shadow duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Ativos</p>
              <span className="h-2.5 w-2.5 rounded-full bg-success" />
            </div>
            <p className="text-2xl font-bold text-success mt-2">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-muted hover:shadow-md transition-shadow duration-200 ease-in-out">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground uppercase font-semibold">Inativos</p>
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
            </div>
            <p className="text-2xl font-bold mt-2">{products.length - activeCount}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : products.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center text-center py-12">
            <Package className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Nenhum produto cadastrado ainda.</p>
            <Button variant="outline" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Criar primeiro produto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <Card
              key={p.id}
              className="overflow-hidden hover:shadow-md transition-all duration-200 ease-in-out hover:border-accent/40 group"
            >
              <div className="relative aspect-square bg-muted/40">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <Badge variant={p.active === false ? 'secondary' : 'success'}>
                    {p.active === false ? 'Inativo' : 'Ativo'}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-3 space-y-1">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                {p.category && (
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {p.category}
                  </p>
                )}
                {p.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="font-bold text-accent">{fmt(Number(p.price))}</span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-accent"
                      title="Editar"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:text-destructive"
                      title="Excluir"
                      onClick={() => setDeletingId(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog criar/editar */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">
              {editing ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Upload de imagem */}
            <div className="space-y-2">
              <Label className="font-semibold">Imagem</Label>
              <div className="flex items-center gap-3">
                <div className="h-20 w-20 shrink-0 rounded-lg border bg-muted/40 overflow-hidden flex items-center justify-center">
                  {imageUrl ? (
                    <img src={imageUrl} alt="preview" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) handleUpload(f)
                      e.target.value = ''
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? 'Enviando…' : 'Enviar imagem'}
                  </Button>
                  {imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImageUrl(null)}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold">Nome *</Label>
              <Input
                placeholder="Ex: Pomada Modeladora"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="font-semibold">Preço (R$) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Categoria</Label>
                <Input
                  placeholder="Geral"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Descrição</Label>
              <Input
                placeholder="Opcional"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="font-semibold">Produto ativo</Label>
                <p className="text-xs text-muted-foreground">
                  Produtos inativos não aparecem no carrinho do cliente.
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog confirmar exclusão */}
      <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">Excluir produto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingId(null)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDelete(deletingId)}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
