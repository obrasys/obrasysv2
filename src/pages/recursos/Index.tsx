import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  MoreHorizontal,
  Pencil,
  Trash2,
  HardHat,
  Wrench,
  Users,
  Building2,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import { useSubempreiteiros, useEquipamentos, useEquipaMembros } from '@/hooks/useRecursos';
import { SubempreiteiroForm, EquipamentoForm, EquipaMembroForm } from '@/components/recursos';
import {
  ESTADO_EQUIPAMENTO_CONFIG,
  TIPO_CONTRATO_CONFIG,
  type Subempreiteiro,
  type Equipamento,
  type EquipaMembro,
} from '@/types/recursos';

export default function RecursosPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('subempreiteiros');
  const [searchTerm, setSearchTerm] = useState('');

  // Subempreiteiros state
  const {
    subempreiteiros,
    loading: loadingSub,
    createSubempreiteiro,
    updateSubempreiteiro,
    deleteSubempreiteiro,
  } = useSubempreiteiros();
  const [subFormOpen, setSubFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subempreiteiro | null>(null);
  const [deletingSub, setDeletingSub] = useState<Subempreiteiro | null>(null);

  // Equipamentos state
  const {
    equipamentos,
    loading: loadingEquip,
    createEquipamento,
    updateEquipamento,
    deleteEquipamento,
  } = useEquipamentos();
  const [equipFormOpen, setEquipFormOpen] = useState(false);
  const [editingEquip, setEditingEquip] = useState<Equipamento | null>(null);
  const [deletingEquip, setDeletingEquip] = useState<Equipamento | null>(null);

  // Equipa state
  const {
    membros,
    loading: loadingMembros,
    createMembro,
    updateMembro,
    deleteMembro,
  } = useEquipaMembros();
  const [membroFormOpen, setMembroFormOpen] = useState(false);
  const [editingMembro, setEditingMembro] = useState<EquipaMembro | null>(null);
  const [deletingMembro, setDeletingMembro] = useState<EquipaMembro | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter helpers
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

  // Handlers
  const handleOpenSubForm = (sub?: Subempreiteiro) => {
    setEditingSub(sub || null);
    setSubFormOpen(true);
  };

  const handleOpenEquipForm = (equip?: Equipamento) => {
    setEditingEquip(equip || null);
    setEquipFormOpen(true);
  };

  const handleOpenMembroForm = (membro?: EquipaMembro) => {
    setEditingMembro(membro || null);
    setMembroFormOpen(true);
  };

  return (
    <AppLayout
      title="Recursos"
      subtitle="Gerir subempreiteiros, equipamentos e equipa"
    >
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <HardHat className="h-4 w-4" />
                Subempreiteiros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{subempreiteiros.filter((s) => s.ativo).length}</p>
              <p className="text-xs text-muted-foreground">ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Equipamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {equipamentos.filter((e) => e.estado === 'disponivel').length}
              </p>
              <p className="text-xs text-muted-foreground">disponíveis</p>
            </CardContent>
          </Card>
          <Card className="col-span-2 md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Equipa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{membros.filter((m) => m.ativo).length}</p>
              <p className="text-xs text-muted-foreground">membros ativos</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <TabsList className="w-full md:w-auto">
                  <TabsTrigger value="subempreiteiros" className="flex-1 md:flex-none">
                    <HardHat className="h-4 w-4 mr-2 hidden md:inline" />
                    Subempreiteiros
                  </TabsTrigger>
                  <TabsTrigger value="equipamentos" className="flex-1 md:flex-none">
                    <Wrench className="h-4 w-4 mr-2 hidden md:inline" />
                    Equipamentos
                  </TabsTrigger>
                  <TabsTrigger value="equipa" className="flex-1 md:flex-none">
                    <Users className="h-4 w-4 mr-2 hidden md:inline" />
                    Equipa
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (activeTab === 'subempreiteiros') handleOpenSubForm();
                      else if (activeTab === 'equipamentos') handleOpenEquipForm();
                      else handleOpenMembroForm();
                    }}
                  >
                    <Plus className="h-4 w-4 md:mr-2" />
                    <span className="hidden md:inline">Adicionar</span>
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {/* Subempreiteiros Tab */}
              <TabsContent value="subempreiteiros" className="m-0">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead className="hidden md:table-cell">Especialidade</TableHead>
                        <TableHead className="hidden md:table-cell">Contacto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingSub ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            A carregar...
                          </TableCell>
                        </TableRow>
                      ) : filteredSubempreiteiros.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum subempreiteiro encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSubempreiteiros.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div className="font-medium">{sub.nome}</div>
                              {sub.nif && (
                                <div className="text-xs text-muted-foreground">NIF: {sub.nif}</div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {sub.especialidade || '-'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-col gap-1">
                                {sub.email && (
                                  <span className="flex items-center gap-1 text-sm">
                                    <Mail className="h-3 w-3" /> {sub.email}
                                  </span>
                                )}
                                {sub.telefone && (
                                  <span className="flex items-center gap-1 text-sm">
                                    <Phone className="h-3 w-3" /> {sub.telefone}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={sub.ativo ? 'default' : 'secondary'}>
                                {sub.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background">
                                  <DropdownMenuItem onClick={() => handleOpenSubForm(sub)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingSub(sub)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Equipamentos Tab */}
              <TabsContent value="equipamentos" className="m-0">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipamento</TableHead>
                        <TableHead className="hidden md:table-cell">Categoria</TableHead>
                        <TableHead className="hidden md:table-cell">Localização</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingEquip ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            A carregar...
                          </TableCell>
                        </TableRow>
                      ) : filteredEquipamentos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhum equipamento encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEquipamentos.map((equip) => (
                          <TableRow key={equip.id}>
                            <TableCell>
                              <div className="font-medium">{equip.nome}</div>
                              {equip.codigo && (
                                <div className="text-xs text-muted-foreground">{equip.codigo}</div>
                              )}
                              {equip.marca && equip.modelo && (
                                <div className="text-xs text-muted-foreground">
                                  {equip.marca} {equip.modelo}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {equip.categoria || '-'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <div className="flex flex-col">
                                {equip.localizacao && <span>{equip.localizacao}</span>}
                                {equip.obra && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Building2 className="h-3 w-3" />
                                    {equip.obra.nome}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={ESTADO_EQUIPAMENTO_CONFIG[equip.estado]?.color}>
                                {ESTADO_EQUIPAMENTO_CONFIG[equip.estado]?.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background">
                                  <DropdownMenuItem onClick={() => handleOpenEquipForm(equip)}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setDeletingEquip(equip)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* Equipa Tab */}
              <TabsContent value="equipa" className="m-0">
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                         <TableHead>Nome</TableHead>
                        <TableHead className="hidden md:table-cell">Cargo</TableHead>
                        <TableHead className="hidden md:table-cell">Obra Atual</TableHead>
                        <TableHead className="hidden md:table-cell">Contrato</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMembros ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            A carregar...
                          </TableCell>
                        </TableRow>
                      ) : filteredMembros.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhum membro encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMembros.map((membro) => (
                          <TableRow 
                            key={membro.id} 
                            className="cursor-pointer"
                            onClick={() => navigate(`/recursos/${membro.id}`)}
                          >
                            <TableCell>
                              <div className="font-medium">{membro.nome}</div>
                              {membro.email && (
                                <div className="text-xs text-muted-foreground">{membro.email}</div>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {membro.cargo || '-'}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {membro.obra_atual?.nome ? (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  <Building2 className="h-3 w-3" />
                                  {membro.obra_atual.nome}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              {membro.tipo_contrato
                                ? TIPO_CONTRATO_CONFIG[membro.tipo_contrato]?.label
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={membro.ativo ? 'default' : 'secondary'}>
                                {membro.ativo ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background">
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/recursos/${membro.id}`); }}>
                                    <User className="mr-2 h-4 w-4" />
                                    Ver Ficha
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenMembroForm(membro); }}>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => { e.stopPropagation(); setDeletingMembro(membro); }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Forms */}
      <SubempreiteiroForm
        open={subFormOpen}
        onOpenChange={(open) => {
          setSubFormOpen(open);
          if (!open) setEditingSub(null);
        }}
        subempreiteiro={editingSub}
        isLoading={isSubmitting}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          if (editingSub) {
            await updateSubempreiteiro(editingSub.id, data);
          } else {
            await createSubempreiteiro(data);
          }
          setIsSubmitting(false);
        }}
      />

      <EquipamentoForm
        open={equipFormOpen}
        onOpenChange={(open) => {
          setEquipFormOpen(open);
          if (!open) setEditingEquip(null);
        }}
        equipamento={editingEquip}
        isLoading={isSubmitting}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          if (editingEquip) {
            await updateEquipamento(editingEquip.id, data);
          } else {
            await createEquipamento(data);
          }
          setIsSubmitting(false);
        }}
      />

      <EquipaMembroForm
        open={membroFormOpen}
        onOpenChange={(open) => {
          setMembroFormOpen(open);
          if (!open) setEditingMembro(null);
        }}
        membro={editingMembro}
        subempreiteiros={subempreiteiros}
        isLoading={isSubmitting}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          if (editingMembro) {
            await updateMembro(editingMembro.id, data);
          } else {
            await createMembro(data);
          }
          setIsSubmitting(false);
        }}
      />

      {/* Delete Dialogs */}
      <AlertDialog open={!!deletingSub} onOpenChange={() => setDeletingSub(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Subempreiteiro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar {deletingSub?.nome}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingSub) {
                  await deleteSubempreiteiro(deletingSub.id);
                  setDeletingSub(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingEquip} onOpenChange={() => setDeletingEquip(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Equipamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar {deletingEquip?.nome}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingEquip) {
                  await deleteEquipamento(deletingEquip.id);
                  setDeletingEquip(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingMembro} onOpenChange={() => setDeletingMembro(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Membro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja eliminar {deletingMembro?.nome}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deletingMembro) {
                  await deleteMembro(deletingMembro.id);
                  setDeletingMembro(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
