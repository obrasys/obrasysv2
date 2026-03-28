import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BrainCircuit,
  Building2,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Clock,
  CreditCard,
  Database,
  FileText,
  HardHat,
  HelpCircle,
  Home,
  Mail,
  Network,
  Plug,
  Settings,
  Shield,
  ShieldCheck,
  Store,
  TicketCheck,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

export type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Visão Geral",
    items: [
      { icon: Home, label: "Dashboard", href: "/dashboard" },
    ],
  },
  {
    label: "Operação",
    items: [
      { icon: Building2, label: "Obras", href: "/obras" },
      { icon: FileText, label: "Orçamentos", href: "/orcamentos" },
      { icon: Calendar, label: "Tarefas", href: "/tarefas" },
      { icon: ClipboardList, label: "RDOs", href: "/rdos" },
      { icon: Clock, label: "Livro de Ponto", href: "/livro-ponto" },
      { icon: ClipboardCheck, label: "Autos de Medição", href: "/autos-medicao" },
      { icon: ShieldCheck, label: "Conformidade", href: "/conformidade" },
    ],
  },
  {
    label: "Comercial",
    items: [
      { icon: Users, label: "Clientes", href: "/clientes" },
      { icon: Network, label: "Fornecedores", href: "/rede-fornecedores" },
      { icon: Database, label: "Base de Preços", href: "/base-precos" },
    ],
  },
  {
    label: "Recursos & Financeiro",
    items: [
      { icon: Wallet, label: "Financeiro", href: "/financeiro" },
      { icon: HardHat, label: "Recursos", href: "/recursos" },
      { icon: Plug, label: "Instalações", href: "/instalacoes" },
    ],
  },
  {
    label: "Relatórios & IA",
    items: [
      { icon: BarChart3, label: "Relatórios", href: "/relatorios" },
      { icon: BrainCircuit, label: "Axia", href: "/axia" },
      { icon: Upload, label: "Importar Dados", href: "/importar" },
    ],
  },
  {
    label: "Conta & Suporte",
    items: [
      { icon: CreditCard, label: "Subscrição", href: "/subscricao" },
      { icon: Settings, label: "Definições", href: "/definicoes" },
      { icon: HelpCircle, label: "Suporte", href: "/suporte" },
    ],
  },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { icon: Shield, label: "Dashboard Admin", href: "/admin" },
  { icon: Users, label: "Utilizadores", href: "/admin/utilizadores" },
  { icon: Wallet, label: "Financeiro Global", href: "/admin/financeiro" },
  { icon: ClipboardList, label: "Auditoria", href: "/admin/auditoria" },
  { icon: Mail, label: "Templates Email", href: "/admin/templates" },
  { icon: BarChart3, label: "Analytics", href: "/admin/analytics" },
  { icon: Store, label: "Fornecedores", href: "/admin/fornecedores" },
  { icon: TicketCheck, label: "Tickets Suporte", href: "/admin/tickets" },
];
