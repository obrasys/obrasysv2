import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Building2,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  HardHat,
  Home,
  Mail,
  Network,
  Plug,
  Shield,
  ShieldCheck,
  Store,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

export const MAIN_NAV_ITEMS: NavItem[] = [
  { icon: Home, label: "Dashboard", href: "/dashboard" },
  { icon: Building2, label: "Obras", href: "/obras" },
  { icon: FileText, label: "Orçamentos", href: "/orcamentos" },
  { icon: ClipboardCheck, label: "Autos de Medição", href: "/autos-medicao" },
  { icon: Database, label: "Base de Preços", href: "/base-precos" },
  { icon: ClipboardList, label: "RDOs", href: "/rdos" },
  { icon: Calendar, label: "Tarefas", href: "/tarefas" },
  { icon: ShieldCheck, label: "Conformidade", href: "/conformidade" },
  { icon: Plug, label: "Instalações", href: "/instalacoes" },
  { icon: Wallet, label: "Financeiro", href: "/financeiro" },
  { icon: HardHat, label: "Recursos", href: "/recursos" },
  { icon: Users, label: "Clientes", href: "/clientes" },
  { icon: Network, label: "Rede de Fornecedores", href: "/rede-fornecedores" },
  { icon: BarChart3, label: "Relatórios", href: "/relatorios" },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { icon: Shield, label: "Dashboard Admin", href: "/admin" },
  { icon: Users, label: "Utilizadores", href: "/admin/utilizadores" },
  { icon: Wallet, label: "Financeiro Global", href: "/admin/financeiro" },
  { icon: ClipboardList, label: "Auditoria", href: "/admin/auditoria" },
  { icon: Mail, label: "Templates Email", href: "/admin/templates" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: BarChart3, label: "Migração V1→V2", href: "/admin/migracao" },
  { icon: Store, label: "Fornecedores", href: "/admin/fornecedores" },
];
