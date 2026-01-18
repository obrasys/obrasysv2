import { useState } from "react";
import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { History, FileText, Loader2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import {
  PriceHistoryTable,
  AuditLogTimeline,
} from "@/components/base-precos";
import {
  useAllMaterialPriceRaw,
  usePriceAuditLog,
} from "@/hooks/useBasePrecos";
import type { PriceRawStatus } from "@/types/base-precos";

export default function BasePrecosAuditoria() {
  const { profile } = useAuth();
  const [statusFilter, setStatusFilter] = useState<PriceRawStatus | "all">(
    "all"
  );

  const { data: rawPrices, isLoading: pricesLoading } =
    useAllMaterialPriceRaw();
  const { data: auditLogs, isLoading: logsLoading } = usePriceAuditLog();

  // Verificar se é admin
  if (profile && profile.role !== "admin") {
    return <Navigate to="/base-precos" replace />;
  }

  // Filtrar preços por status
  const filteredPrices =
    statusFilter === "all"
      ? rawPrices
      : rawPrices?.filter((p) => p.status === statusFilter);

  return (
    <AppLayout title="Auditoria de Preços">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" />
            Auditoria de Preços
          </h1>
          <p className="text-muted-foreground mt-1">
            Histórico completo e log de ações (apenas administradores)
          </p>
        </div>

        <Tabs defaultValue="history">
          <TabsList>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico de Preços
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Log de Auditoria
            </TabsTrigger>
          </TabsList>

          {/* Tab: Histórico de Preços */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Preços Brutos</CardTitle>
                <Select
                  value={statusFilter}
                  onValueChange={(v) =>
                    setStatusFilter(v as PriceRawStatus | "all")
                  }
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="accepted">Aceites</SelectItem>
                    <SelectItem value="rejected">Rejeitados</SelectItem>
                    <SelectItem value="penalized">Penalizados</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {pricesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <PriceHistoryTable prices={filteredPrices || []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Log de Auditoria */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Ações do Sistema
                </CardTitle>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <AuditLogTimeline logs={auditLogs || []} />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
