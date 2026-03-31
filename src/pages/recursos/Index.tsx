import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  HardHat,
  Wrench,
  Users,
  Building2,
  Phone,
  Mail,
  User,
  Briefcase,
  Euro,
  Wallet,
} from 'lucide-react';
import { useSubempreiteiros, useEquipamentos, useEquipaMembros } from '@/hooks/useRecursos';
import { SubempreiteiroForm, EquipamentoForm, EquipaMembroForm } from '@/components/recursos';
import { SalariosTab } from '@/components/recursos/SalariosTab';
import {
  ESTADO_EQUIPAMENTO_CONFIG,
  TIPO_CONTRATO_CONFIG,
  type Subempreiteiro,
  type Equipamento,
  type EquipaMembro,
} from '@/types/recursos';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function RecursosPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('subempreiteiros');
  const [searchTerm, setSearchTerm] = useState('');

  const { subempreiteiros, loading: loadingSub, createSubempreiteiro, updateSubempreiteiro, deleteSubempreiteiro } = useSubempreiteiros();
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subempreiteiro | null>(null);
  const [deletingSub, setDeletingSub] = useState<Subempreiteiro | null>(null);

  const { equipamentos, loading: loadingEquip, createEquipamento, updateEquipamento, deleteEquipamento } = useEquipamentos();
  const [equipFormOpen, setEquipFormOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);
  const [deletingEquip, setDeletingEquip] = useState<Equipamento | null>(null);

  const { membros, loading: loadingMembros, createMembro, updateMembro, deleteMembro } = useEquipaMembros();
  const [membroFormOpen, setMembroFormOpen] = useState(false);
  const [editingMembro, setEditingMembro] = useState<EquipaMembro | null>(null);
  const [deletingMembro, setDeletingMembro] = useState<EquipaMembro | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSubempreiteiros = subempreiteiros.filter((s) =>
    s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.especialidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredEquipamentos = equipamentos.filter((e) =>
    e.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredMembros = membros.filter((m) =>
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenSubForm = (sub?: Subempreiteiro) => { setEditingSub(sub || null); setSubFormOpen(true); };
  const handleOpenEquipForm = (equip?: Equipamento) => { setEditingEquip(equip || null); setEquipFormOpen(true); };
  const handleOpenMembroForm = (membro?: EquipaMembro) => { setEditingMembro(membro || null); setMembroFormOpen(true); };

  return (
    <AppLayout title="Recursos" subtitle="Gerir subempreiteiros, equipamentos e equipa">
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><HardHat className="h-4 w-4" />Subempreiteiros</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{subempreiteiros.filter(s => s.ativo).length}</p><p className="text-xs text-muted-foreground">ativos</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Wrench className="h-4 w-4" />Equipamentos</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{equipamentos.filter(e => e.estado === 'disponivel').length}</p><p className="text-xs text-muted-foreground">disponíveis</p></CardContent></Card>
          <Card className="col-span-2 md:col-span-1"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4" />Equipa</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{membros.filter(m => m.ativo).length}</p><p className="text-xs text-muted-foreground">membros ativos</p></CardContent></Card>
        </div>

        {/* Tabs */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <TabsList className="w-full md:w-auto">
                  <TabsTrigger value="subempreiteiros" className="flex-1 md:flex-none"><HardHat className="h-4 w-4 mr-2 hidden md:inline" />Subempreiteiros</TabsTrigger>
                  <TabsTrigger value="equipamentos" className="flex-1 md:flex-none"><Wrench className="h-4 w-4 mr-2 hidden md:inline" />Equipamentos</TabsTrigger>
                  <TabsTrigger value="equipa" className="flex-1 md:flex-none"><Users className="h-4 w-4 mr-2 hidden md:inline" />Equipa</TabsTrigger>
                  <TabsTrigger value="salarios" className="flex-1 md:flex-none"><Wallet className="h-4 w-4 mr-2 hidden md:inline" />Salários</TabsTrigger>
                </TabsList>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
                  </div>
                  <Button size="sm" onClick={() => {
                    if (activeTab === 'subempreiteiros') handleOpenSubForm();
                    else if (activeTab === 'equipamentos') handleOpenEquipForm();
                    else handleOpenMembroForm();
                  }}>
                    <Plus className="h-4 w-4 md:mr-2" /><span className="hidden md:inline">Adicionar</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Subempreiteiros Cards */}
              <TabsContent value="subempreiteiros" className="m-0">
                {loadingSub ? (
                  <p className="text-center py-8 text-muted-foreground">A carregar...</p>
                ) : filteredSubempreiteiros.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <HardHat className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">Nenhum subempreiteiro encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSubempreiteiros.map((sub) => (
                      <Card key={sub.id} className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-14 w-14 shrink-0 border-2 border-border">
                              {sub.foto_url && <AvatarImage src={sub.foto_url} alt={sub.nome} />}
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(sub.nome)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-primary truncate">{sub.nome}</h3>
                                  {sub.especialidade && <p className="text-sm text-muted-foreground truncate">{sub.especialidade}</p>}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-background">
                                    <DropdownMenuItem onClick={() => handleOpenSubForm(sub)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeletingSub(sub)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="mt-2 space-y-1">
                                {sub.telefone && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Phone className="h-3 w-3" />{sub.telefone}</p>}
                                {sub.email && <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate"><Mail className="h-3 w-3" />{sub.email}</p>}
                                {sub.nif && <p className="text-xs text-muted-foreground">NIF: {sub.nif}</p>}
                              </div>
                              <div className="mt-3">
                                <Badge variant={sub.ativo ? 'default' : 'secondary'}>{sub.ativo ? 'Ativo' : 'Inativo'}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Equipamentos Cards */}
              <TabsContent value="equipamentos" className="m-0">
                {loadingEquip ? (
                  <p className="text-center py-8 text-muted-foreground">A carregar...</p>
                ) : filteredEquipamentos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Wrench className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">Nenhum equipamento encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEquipamentos.map((equip) => (
                      <Card key={equip.id} className="group hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-14 w-14 shrink-0 border-2 border-border">
                              {equip.foto_url && <AvatarImage src={equip.foto_url} alt={equip.nome} />}
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(equip.nome)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-primary truncate">{equip.nome}</h3>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {[equip.marca, equip.modelo].filter(Boolean).join(' ') || equip.categoria || equip.codigo || '-'}
                                  </p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-background">
                                    <DropdownMenuItem onClick={() => handleOpenEquipForm(equip)}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setDeletingEquip(equip)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="mt-2 space-y-1">
                                {equip.categoria && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Briefcase className="h-3 w-3" />{equip.categoria}</p>}
                                {equip.obra && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3 w-3" />{equip.obra.nome}</p>}
                                {equip.valor_aquisicao != null && equip.valor_aquisicao > 0 && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Euro className="h-3 w-3" />{equip.valor_aquisicao.toLocaleString('pt-PT', { minimumFractionDigits: 2 })} €</p>
                                )}
                              </div>
                              <div className="mt-3">
                                <Badge className={ESTADO_EQUIPAMENTO_CONFIG[equip.estado]?.color}>{ESTADO_EQUIPAMENTO_CONFIG[equip.estado]?.label}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Equipa Cards */}
              <TabsContent value="equipa" className="m-0">
                {loadingMembros ? (
                  <p className="text-center py-8 text-muted-foreground">A carregar...</p>
                ) : filteredMembros.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Users className="h-10 w-10 mb-3 opacity-40" />
                    <p className="text-sm">Nenhum membro encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredMembros.map((membro) => (
                      <Card key={membro.id} className="group hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/recursos/${membro.id}`)}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <Avatar className="h-14 w-14 shrink-0 border-2 border-border">
                              {membro.foto_url && <AvatarImage src={membro.foto_url} alt={membro.nome} />}
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{getInitials(membro.nome)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="min-w-0">
                                  <h3 className="font-semibold text-primary truncate">{membro.nome}</h3>
                                  <p className="text-sm text-muted-foreground truncate">{membro.cargo || 'Sem cargo'}</p>
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-background">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/recursos/${membro.id}`); }}><User className="mr-2 h-4 w-4" />Ver Ficha</DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenMembroForm(membro); }}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeletingMembro(membro); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <div className="mt-2 space-y-1">
                                {membro.obra_atual?.nome && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3 w-3" />{membro.obra_atual.nome}</p>
                                )}
                                {membro.tipo_contrato && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Briefcase className="h-3 w-3" />{TIPO_CONTRATO_CONFIG[membro.tipo_contrato]?.label}</p>
                                )}
                                {membro.subempreiteiro?.nome && (
                                  <p className="text-xs text-muted-foreground flex items-center gap-1.5"><HardHat className="h-3 w-3" />{membro.subempreiteiro.nome}</p>
                                )}
                              </div>
                              <div className="mt-3">
                                <Badge variant={membro.ativo ? 'default' : 'secondary'}>{membro.ativo ? 'Ativo' : 'Inativo'}</Badge>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Forms */}
      <SubempreiteiroForm open={subFormOpen} onOpenChange={(open) => { setSubFormOpen(open); if (!open) setEditingSub(null); }} subempreiteiro={editingSub} isLoading={isSubmitting}
        onSubmit={async (data) => { setIsSubmitting(true); if (editingSub) await updateSubempreiteiro(editingSub.id, data); else await createSubempreiteiro(data); setIsSubmitting(false); }} />

      <EquipamentoForm open={equipFormOpen} onOpenChange={(open) => { setEquipFormOpen(open); if (!open) setEditingEquip(null); }} equipamento={editingEquip} isLoading={isSubmitting}
        onSubmit={async (data) => { setIsSubmitting(true); if (editingEquip) await updateEquipamento(editingEquip.id, data); else await createEquipamento(data); setIsSubmitting(false); }} />

      <EquipaMembroForm open={membroFormOpen} onOpenChange={(open) => { setMembroFormOpen(open); if (!open) setEditingMembro(null); }} membro={editingMembro} subempreiteiros={subempreiteiros} isLoading={isSubmitting}
        onSubmit={async (data) => { setIsSubmitting(true); if (editingMembro) await updateMembro(editingMembro.id, data); else await createMembro(data); setIsSubmitting(false); }} />

      {/* Delete Dialogs */}
      <AlertDialog open={!!deletingSub} onOpenChange={() => setDeletingSub(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar Subempreiteiro</AlertDialogTitle>
          <AlertDialogDescription>Tem a certeza que deseja eliminar {deletingSub?.nome}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deletingSub) { await deleteSubempreiteiro(deletingSub.id); setDeletingSub(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingEquip} onOpenChange={() => setDeletingEquip(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar Equipamento</AlertDialogTitle>
          <AlertDialogDescription>Tem a certeza que deseja eliminar {deletingEquip?.nome}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deletingEquip) { await deleteEquipamento(deletingEquip.id); setDeletingEquip(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingMembro} onOpenChange={() => setDeletingMembro(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Eliminar Membro</AlertDialogTitle>
          <AlertDialogDescription>Tem a certeza que deseja eliminar {deletingMembro?.nome}? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deletingMembro) { await deleteMembro(deletingMembro.id); setDeletingMembro(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
