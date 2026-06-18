import { useCallback, useState } from "react";
import { Download, FileText, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/patterns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function DefinicoesLegal() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!user?.id) return;
    setExporting(true);
    try {
      const [obras, orcamentos, clientes, rdos, contas] = await Promise.all([
        supabase.from("obras").select("*").eq("user_id", user.id),
        supabase.from("orcamentos").select("*").eq("user_id", user.id),
        supabase.from("clientes").select("*").eq("user_id", user.id),
        supabase.from("relatorios_diarios").select("*").eq("user_id", user.id),
        supabase.from("contas_financeiras").select("*").eq("user_id", user.id),
      ]);
      const data = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        user_email: user.email,
        obras: obras.data ?? [],
        orcamentos: orcamentos.data ?? [],
        clientes: clientes.data ?? [],
        relatorios_diarios: rdos.data ?? [],
        contas_financeiras: contas.data ?? [],
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `obra-sys-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Dados exportados.");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao exportar dados.");
    } finally {
      setExporting(false);
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <SectionCard title="Documentos legais" description="Termos, política de privacidade e RGPD.">
        <ul className="space-y-2 text-sm">
          {[
            { label: "Termos de Serviço", href: "/legal/termos" },
            { label: "Política de Privacidade", href: "/legal/privacidade" },
            { label: "Política RGPD", href: "/legal/rgpd" },
          ].map((d) => (
            <li
              key={d.label}
              className="flex items-center justify-between rounded-xl border border-border-subtle bg-surface-elevated p-3"
            >
              <span className="flex items-center gap-2 text-text-strong">
                <FileText className="h-4 w-4 text-text-muted" />
                {d.label}
              </span>
              <span className="text-xs text-text-muted">Em breve</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Exportação de dados"
        description="Descarrega uma cópia completa dos teus dados no Obra Sys (RGPD)."
      >
        <Button onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "A exportar…" : "Exportar dados (JSON)"}
        </Button>
      </SectionCard>

      <SectionCard
        title="Retenção e backups"
        description="A tua organização tem backups automáticos diários. Períodos de retenção em revisão."
      >
        <div className="flex items-start gap-3 rounded-xl border border-border-subtle bg-surface-sunken/40 p-4 text-sm text-text-muted">
          <Shield className="h-4 w-4 text-text-muted" />
          <span>Backups geridos pela Lovable Cloud. Para recuperação de dados, contacta o suporte.</span>
        </div>
      </SectionCard>

      <SectionCard
        title="Eliminação de conta"
        description="A eliminação é permanente. Esta ação requer confirmação por email com o suporte."
      >
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => toast.error("Esta operação requer confirmação adicional. Contacta o suporte.")}
        >
          <Trash2 className="mr-2 h-4 w-4" /> Solicitar eliminação de conta
        </Button>
      </SectionCard>
    </div>
  );
}
