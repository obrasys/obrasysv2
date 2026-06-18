import { useNavigate } from "react-router-dom";
import { Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard, EmptyState } from "@/components/patterns";

export default function DefinicoesOrganizacao() {
  const navigate = useNavigate();
  return (
    <SectionCard
      title="Perfil da organização"
      description="Razão social, NIF, CAE, morada fiscal, logotipo, cor da marca e contactos."
    >
      <EmptyState
        icon={Building2}
        title="Editar dados da organização"
        description="A gestão completa da empresa fica na página Gestão da Empresa."
        action={
          <Button onClick={() => navigate("/empresa/gestao")}>
            Abrir Gestão da Empresa <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        }
      />
    </SectionCard>
  );
}
