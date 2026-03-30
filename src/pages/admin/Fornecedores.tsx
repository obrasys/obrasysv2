import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useSupplierInvites, useCreateSupplierInvite, useAdminSupplierProfiles, useToggleSupplierCertification } from '@/hooks/useSuppliers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Store, Plus, ShieldCheck, Shield, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function AdminFornecedores() {
  const { data: invites = [] } = useSupplierInvites();
  const { data: suppliers = [] } = useAdminSupplierProfiles();
  const createInvite = useCreateSupplierInvite();
  const toggleCert = useToggleSupplierCertification();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const handleInvite = () => {
    if (!email.trim()) return;
    createInvite.mutate(email, { onSuccess: () => setEmail('') });
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/fornecedor/auth?invite=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
    toast({ title: 'Link copiado!' });
  };

  return (
    <AdminLayout title="Rede de Fornecedores" subtitle="Gestão de fornecedores parceiros">
      <div className="p-4 md:p-6 space-y-4">
        <Tabs defaultValue="suppliers">
          <TabsList>
            <TabsTrigger value="suppliers" className="text-xs">Fornecedores ({suppliers.length})</TabsTrigger>
            <TabsTrigger value="invites" className="text-xs">Convites ({invites.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  Fornecedores Registados
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!suppliers.length ? (
                  <p className="text-center py-12 text-muted-foreground text-sm">Sem fornecedores registados</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empresa</TableHead>
                        <TableHead>NIF</TableHead>
                        <TableHead>Distrito</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Cert.</TableHead>
                        <TableHead>Desde</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {suppliers.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{s.trade_name || s.legal_name}</p>
                              {s.trade_name && <p className="text-[11px] text-muted-foreground">{s.legal_name}</p>}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{s.nif || '—'}</TableCell>
                          <TableCell className="text-xs">{s.location_district || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                              {s.status === 'active' ? 'Ativo' : s.status === 'pending' ? 'Pendente' : 'Suspenso'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {s.is_certified ? <ShieldCheck className="h-4 w-4 text-primary" /> : <Shield className="h-4 w-4 text-muted-foreground" />}
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground">{format(new Date(s.created_at), "d MMM yy", { locale: pt })}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {s.status === 'pending' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleCert.mutate({ id: s.id, isCertified: false, status: 'active' })}>Aprovar</Button>
                              )}
                              {s.status === 'active' && !s.is_certified && (
                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => toggleCert.mutate({ id: s.id, isCertified: true, status: 'active' })}>Certificar</Button>
                              )}
                              {s.is_certified && (
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleCert.mutate({ id: s.id, isCertified: false, status: 'active' })}>Rem. cert.</Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites" className="mt-4 space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Convidar Fornecedor</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Input placeholder="email@fornecedor.pt" type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleInvite()} className="flex-1" />
                  <Button size="sm" onClick={handleInvite} disabled={createInvite.isPending}>
                    <Plus className="h-3.5 w-3.5 mr-1" />Convidar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Convites Criados</CardTitle></CardHeader>
              <CardContent className="p-0">
                {!invites.length ? (
                  <p className="text-center py-8 text-muted-foreground text-sm">Sem convites</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Expira</TableHead>
                        <TableHead>Link</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((inv: any) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium text-sm">{inv.email}</TableCell>
                          <TableCell>
                            <Badge variant={inv.status === 'accepted' ? 'default' : 'secondary'} className="text-xs">
                              {inv.status === 'pending' ? 'Pendente' : inv.status === 'accepted' ? 'Aceite' : 'Expirado'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{format(new Date(inv.expires_at), "d MMM yy", { locale: pt })}</TableCell>
                          <TableCell>
                            {inv.status === 'pending' && (
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => copyLink(inv.token)}>
                                {copiedToken === inv.token ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                <span className="ml-1">{copiedToken === inv.token ? 'Copiado' : 'Copiar'}</span>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
