import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  ArrowLeft,
  User,
  Building2,
  Briefcase,
  Mail,
  Phone,
  Calendar,
  Wallet,
  Plus,
  Loader2,
  ArrowRightLeft,
} from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEquipaMembros, useSubempreiteiros } from '@/hooks/useRecursos';
import { useAlocacoesByMembro, useAlocacoes } from '@/hooks/useAlocacoes';
import { useObras } from '@/hooks/useObras';
import { AlocacaoForm } from '@/components/recursos/AlocacaoForm';
import { TIPO_CONTRATO_CONFIG } from '@/types/recursos';

export default function VerMembroPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { membros, loading: loadingMembros } = useEquipaMembros();
  const { subempreiteiros } = useSubempreiteiros();
  const { alocacoes, loading: loadingAlocacoes, refetch } = useAlocacoesByMembro(id);
  const { createAlocacao, transferirMembro } = useAlocacoes();
  const { obras } = useObras();
  const [formOpen, setFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const membro = membros.find(m => m.id === id);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(value);

  if (loadingMembros) {
    return (
      <AppLayout title="A carregar...">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  if (!membro) {
    return (
      <AppLayout title="Membro não encontrado">
        <div className="p-6 text-center">
          <p className="text-muted-foreground">O membro solicitado não foi encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/recursos')}>
            Voltar aos Recursos
          </Button>
        </div>
      </AppLayout>
    );
  }

  const alocacaoAtiva = alocacoes.find(a => a.ativo);
  const totalCustos = alocacoes.reduce((sum, a) => {
    if (a.custo_dia) {
      const dias = a.data_fim
        ? Math.ceil((new Date(a.data_fim).getTime() - new Date(a.data_inicio).getTime()) / (1000 * 60 * 60 * 24))
        : Math.ceil((new Date().getTime() - new Date(a.data_inicio).getTime()) / (1000 * 60 * 60 * 24));
      return sum + a.custo_dia * Math.max(dias, 0);
    }
    return sum;
  }, 0);

  return (
    <AppLayout
      title={membro.nome}
      subtitle={membro.cargo || 'Membro da Equipa'}
      actions={
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/recursos')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Alocar a Obra
          </Button>
        </div>
      }
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Dados Pessoais */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Dados Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                {membro.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{membro.email}</span>
                  </div>
                )}
                {membro.telefone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{membro.telefone}</span>
                  </div>
                )}
                {membro.nif && (
                  <div>
                    <span className="text-sm text-muted-foreground">NIF: </span>
                    <span className="text-sm font-medium">{membro.nif}</span>
                  </div>
                )}
                {membro.tipo_contrato && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{TIPO_CONTRATO_CONFIG[membro.tipo_contrato]?.label}</span>
                  </div>
                )}
                {membro.data_admissao && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">
                      Admissão: {format(new Date(membro.data_admissao), "dd/MM/yyyy")}
                    </span>
                  </div>
                )}
                {membro.subempreiteiro && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Subempreiteiro: {membro.subempreiteiro.nome}</span>
                  </div>
                )}
              </div>
              {membro.observacoes && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">{membro.observacoes}</p>
                </div>
              )}
              <div className="flex items-center gap-2 pt-2">
                <Badge variant={membro.ativo ? 'default' : 'secondary'}>
                  {membro.ativo ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resumo Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="w-5 h-5" />
                Resumo Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Salário Base</p>
                <p className="text-xl font-bold">
                  {membro.salario_base ? formatCurrency(membro.salario_base) : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Custo Total Estimado</p>
                <p className="text-xl font-bold">{formatCurrency(totalCustos)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Obras Associadas</p>
                <p className="text-xl font-bold">{alocacoes.length}</p>
              </div>
              {alocacaoAtiva && (
                <div>
                  <p className="text-sm text-muted-foreground">Obra Atual</p>
                  <Badge variant="outline" className="mt-1">
                    <Building2 className="w-3 h-3 mr-1" />
                    {alocacaoAtiva.obra?.nome || 'Obra'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Histórico de Alocações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5" />
              Histórico de Alocações
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAlocacoes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : alocacoes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhuma alocação registada.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {alocacoes.map((aloc) => (
                  <div
                    key={aloc.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${aloc.ativo ? 'bg-green-100' : 'bg-muted'}`}>
                        <Building2 className={`w-4 h-4 ${aloc.ativo ? 'text-green-600' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{aloc.obra?.nome || 'Obra'}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(aloc.data_inicio), "dd/MM/yyyy")}
                          {aloc.data_fim ? ` → ${format(new Date(aloc.data_fim), "dd/MM/yyyy")}` : ' → Presente'}
                          {aloc.funcao && ` • ${aloc.funcao}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {(aloc.custo_dia || aloc.custo_hora) && (
                        <p className="text-sm font-medium">
                          {aloc.custo_dia ? `${formatCurrency(aloc.custo_dia)}/dia` : ''}
                          {aloc.custo_dia && aloc.custo_hora ? ' • ' : ''}
                          {aloc.custo_hora ? `${formatCurrency(aloc.custo_hora)}/h` : ''}
                        </p>
                      )}
                      <Badge variant={aloc.ativo ? 'default' : 'secondary'} className="text-xs">
                        {aloc.ativo ? 'Ativa' : 'Encerrada'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlocacaoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        membros={membros}
        obras={obras?.filter(o => !o.arquivada).map(o => ({ id: o.id, nome: o.nome })) || []}
        defaultMembroId={id}
        isLoading={isSubmitting}
        onSubmit={async (data) => {
          setIsSubmitting(true);
          await createAlocacao(data);
          await refetch();
          setIsSubmitting(false);
        }}
      />
    </AppLayout>
  );
}
