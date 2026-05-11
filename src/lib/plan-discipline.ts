import type { PlanDisciplina } from "@/types/plan-measurements";
import {
  Building2,
  HardHat,
  Plug,
  Droplets,
  Wind,
  Radio,
  Shapes,
  type LucideIcon,
} from "lucide-react";

export interface DisciplineMeta {
  value: PlanDisciplina;
  label: string;
  icon: LucideIcon;
  /** Curta descrição visível ao utilizador no upload. */
  description: string;
  /** Cor do badge (token tailwind). */
  badgeClass: string;
}

export const DISCIPLINE_META: Record<PlanDisciplina, DisciplineMeta> = {
  arquitetura: {
    value: "arquitetura",
    label: "Arquitetura",
    icon: Building2,
    description: "Compartimentos, paredes, vãos, áreas e quantitativos arquitetónicos.",
    badgeClass: "bg-primary/10 text-primary border-primary/20",
  },
  estruturas: {
    value: "estruturas",
    label: "Estruturas",
    icon: HardHat,
    description: "Lajes, pilares, vigas e elementos estruturais.",
    badgeClass: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  eletrica: {
    value: "eletrica",
    label: "Elétrica",
    icon: Plug,
    description: "Pontos de luz, tomadas, quadros e circuitos elétricos. Sem leitura arquitetónica.",
    badgeClass: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  },
  canalizacao: {
    value: "canalizacao",
    label: "Canalização",
    icon: Droplets,
    description: "Águas, esgotos, pontos hidráulicos e percursos.",
    badgeClass: "bg-sky-500/10 text-sky-700 border-sky-500/20",
  },
  avac: {
    value: "avac",
    label: "AVAC",
    icon: Wind,
    description: "Climatização, ventilação e equipamentos AVAC.",
    badgeClass: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20",
  },
  telecom: {
    value: "telecom",
    label: "Telecomunicações",
    icon: Radio,
    description: "Pontos de rede, RITA, voz/dados e antenas.",
    badgeClass: "bg-violet-500/10 text-violet-700 border-violet-500/20",
  },
  outra: {
    value: "outra",
    label: "Outra / Modo livre",
    icon: Shapes,
    description: "Disciplina não especificada — todas as ferramentas ficam disponíveis.",
    badgeClass: "bg-muted text-muted-foreground border-border",
  },
};

export const DISCIPLINE_LIST: DisciplineMeta[] = [
  DISCIPLINE_META.arquitetura,
  DISCIPLINE_META.estruturas,
  DISCIPLINE_META.eletrica,
  DISCIPLINE_META.canalizacao,
  DISCIPLINE_META.avac,
  DISCIPLINE_META.telecom,
  DISCIPLINE_META.outra,
];

export interface DisciplineScope {
  /** Quadros arquitetónicos: Parâmetros, Compartimentos, Paredes, Quantitativos globais. */
  showArchitectureTables: boolean;
  /** Painel "Analisar Planta Elétrica". */
  showElectricalAnalysis: boolean;
  /** Painel Axia para outras especialidades (canalização, AVAC, telecom). */
  showSpecialtyAnalysis: boolean;
  /** Mostrar tabs de Compartimentos/Paredes no painel lateral. */
  showRoomsAndWallsTabs: boolean;
  /** Etiqueta amigável da disciplina ativa. */
  label: string;
}

export function disciplineScope(d: PlanDisciplina | undefined | null): DisciplineScope {
  const disc = (d ?? "arquitetura") as PlanDisciplina;
  switch (disc) {
    case "arquitetura":
      return {
        showArchitectureTables: true,
        showElectricalAnalysis: false,
        showSpecialtyAnalysis: false,
        showRoomsAndWallsTabs: true,
        label: DISCIPLINE_META.arquitetura.label,
      };
    case "estruturas":
      return {
        showArchitectureTables: true,
        showElectricalAnalysis: false,
        showSpecialtyAnalysis: false,
        showRoomsAndWallsTabs: true,
        label: DISCIPLINE_META.estruturas.label,
      };
    case "eletrica":
      return {
        showArchitectureTables: false,
        showElectricalAnalysis: true,
        showSpecialtyAnalysis: false,
        showRoomsAndWallsTabs: false,
        label: DISCIPLINE_META.eletrica.label,
      };
    case "canalizacao":
    case "avac":
    case "telecom":
      return {
        showArchitectureTables: false,
        showElectricalAnalysis: false,
        showSpecialtyAnalysis: true,
        showRoomsAndWallsTabs: false,
        label: DISCIPLINE_META[disc].label,
      };
    case "outra":
    default:
      return {
        showArchitectureTables: true,
        showElectricalAnalysis: true,
        showSpecialtyAnalysis: true,
        showRoomsAndWallsTabs: true,
        label: DISCIPLINE_META.outra.label,
      };
  }
}
