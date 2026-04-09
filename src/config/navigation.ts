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
  Plug,
  Settings,
  Shield,
  Store,
  TicketCheck,
  Upload,
  Users,
  Wallet,
  ArrowRightLeft,
  Network,
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
    label: "Comercial",
    items: [
      { icon: Users, label: "Clientes", href: "/clientes" },
      { icon: FileText, label: "Orçamentos", href: "/orcamentos" },
      { icon: Database, label: "Base de Preços", href: "/base-precos" },
    ],
  },
  {
    label: "Obras",
    items: [
      { icon: Building2, label: "Todas as Obras", href: "/obras" },
      { icon: Calendar, label: "Tarefas", href: "/tarefas" },
      { icon: ClipboardList, label: "RDOs", href: "/rdos" },
      { icon: ClipboardCheck, label: "Autos de Medição", href: "/autos-medicao" },
      { icon: Clock, label: "Livro de Ponto", href: "/livro-ponto" },
      { icon: Shield, label: "Conformidade", href: "/conformidade" },
    ],
  },
  {
    label: "Recursos",
    items: [
      { icon: HardHat, label: "Equipas", href: "/recursos" },
      { icon: Plug, label: "Instalações", href: "/instalacoes" },
      { icon: Network, label: "Fornecedores", href: "/rede-fornecedores" },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { icon: Wallet, label: "Financeiro", href: "/financeiro" },
    ],
  },
  {
    label: "Documentos & IA",
    items: [
      { icon: BarChart3, label: "Relatórios", href: "/relatorios" },
      { icon: BrainCircuit, label: "Axia", href: "/axia" },
      { icon: Upload, label: "Importar Dados", href: "/importar" },
    ],
  },
  {
    label: "Conta",
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
  { icon: ArrowRightLeft, label: "Migração", href: "/admin/migracao" },
];
