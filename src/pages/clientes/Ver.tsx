import { useNavigate, useParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ClienteStatusBadge } from '@/components/clientes';
import { useCliente } from '@/hooks/useClientes';
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  Building2, 
  MapPin, 
  FileText,
  HardHat,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { pt } from 'date-fns/locale';

export default function VerClientePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { cliente, obras, orcamentos, isLoading } = useCliente(id);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (isLoading) {
    return (
      <AppLayout title="Cliente">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!cliente) {
    return (
      <AppLayout title="Cliente não encontrado">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">Cliente não encontrado</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              O cliente que procura não existe ou foi eliminado.
            </p>
            <Button className="mt-4" onClick={() => navigate('/clientes')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar à lista
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={cliente.nome}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/clientes')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{cliente.nome}</h1>
                <ClienteStatusBadge nivel={cliente.nivel_acesso} />
                {!cliente.ativo && <Badge variant="secondary">Inativo</Badge>}
              </div>
              {cliente.empresa && (
                <p className="text-muted-foreground flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {cliente.empresa}
                </p>
              )}
            </div>
          </div>
          <Button onClick={() => navigate(`/clientes/${id}/editar`)}>
            <Edit className="mr-2 h-4 w-4" />
            Editar
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações de Contacto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cliente.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`mailto:${cliente.email}`} 
                    className="text-primary hover:underline"
                  >
                    {cliente.email}
                  </a>
                </div>
              )}
              {cliente.telemovel && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`tel:${cliente.telemovel}`}
                    className="hover:underline"
                  >
                    {cliente.telemovel}
                  </a>
                </div>
              )}
              {cliente.telefone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a 
                    href={`tel:${cliente.telefone}`}
                    className="hover:underline"
                  >
                    {cliente.telefone} (fixo)
                  </a>
                </div>
              )}
              {cliente.nif && (
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>NIF: {cliente.nif}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent>
              {cliente.endereco || cliente.cidade ? (
                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    {cliente.endereco && <p>{cliente.endereco}</p>}
                    <p>
                      {cliente.codigo_postal && `${cliente.codigo_postal} `}
                      {cliente.cidade}
                    </p>
                    {cliente.pais && <p>{cliente.pais}</p>}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nenhum endereço registado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Obras */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <HardHat className="h-4 w-4" />
              Obras ({obras?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {obras && obras.length > 0 ? (
              <div className="space-y-3">
                {obras.map((obra) => (
                  <div 
                    key={obra.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/obras/${obra.id}`)}
                  >
                    <div>
                      <p className="font-medium">{obra.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Progresso: {obra.progresso}%
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatCurrency(obra.valor_previsto)}
                      </span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma obra associada a este cliente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Orcamentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Orçamentos ({orcamentos?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orcamentos && orcamentos.length > 0 ? (
              <div className="space-y-3">
                {orcamentos.map((orcamento) => (
                  <div 
                    key={orcamento.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/orcamentos/${orcamento.id}/editar`)}
                  >
                    <div>
                      <p className="font-medium">{orcamento.titulo}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(orcamento.created_at), { 
                          addSuffix: true, 
                          locale: pt 
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{orcamento.status}</Badge>
                      <span className="text-sm font-medium">
                        {formatCurrency(orcamento.valor_total)}
                      </span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhum orçamento associado a este cliente
              </p>
            )}
          </CardContent>
        </Card>

        {/* Observations */}
        {cliente.observacoes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{cliente.observacoes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
