import { useNavigate } from "react-router-dom";
import { User, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard, EmptyState } from "@/components/patterns";

export default function DefinicoesPerfil() {
  const navigate = useNavigate();
  return (
    <SectionCard
      title="Perfil"
      description="Os dados do teu perfil ficam centralizados na página dedicada."
    >
      <EmptyState
        icon={User}
        title="Editar perfil completo"
        description="Foto, nome, cargo, bio, idioma, fuso horário, papel e organização — tudo na página de Perfil."
        action={
          <Button onClick={() => navigate("/perfil")}>
            Abrir Perfil <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        }
      />
    </SectionCard>
  );
}
