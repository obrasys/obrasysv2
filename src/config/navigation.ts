import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Blocks,
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
  Layers,
  Mail,
  Map,
  Network,
  Package,
  Plug,
  Send,
  Settings,
  Shield,
  Sparkles,
  Store,
  TicketCheck,
  Truck,
  Upload,
  UserCog,
  Users,
  Wallet,
  ArrowRightLeft,
  Briefcase,
} from "lucide-react";

export type NavItem = {
  icon: LucideIcon;
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

/**
 * Navigation taxonomy aligned with the redesign plan.
 * Only routes that actually exist in App.tsx are listed here.
 * Items marked "em breve" in the plan are intentionally omitted until backing routes exist.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Dashboard",
    icon: Home,
    items: [{ icon: Home, label: "Dashboard", href: "/dashboard" }],
  },
  {
    label: "Obras",
    icon: Building2,
    items: [
      { icon: Building2, label: "Todas as obras", href: "/obras" },
      { icon: ClipboardCheck, label: "Autos de medição", href: "/autos-medicao" },
      { icon: ClipboardList, label: "RDOs", href: "/rdos" },
      { icon: Calendar, label: "Tarefas", href: "/tarefas" },
      { icon: Clock, label: "Livro de ponto", href: "/livro-ponto" },
      { icon: Shield, label: "Conformidade", href: "/conformidade" },
    ],
  },
  {
    label: "Orçamentos",
    icon: FileText,
    items: [
      { icon: FileText, label: "Orçamentos", href: "/orcamentos" },
      { icon: Users, label: "Clientes", href: "/clientes" },
    ],
  },
  {
    label: "Planta & ICF",
    icon: Map,
    items: [
      { icon: Blocks, label: "ICF", href: "/icf" },
      { icon: Layers, label: "Biblioteca ICF", href: "/icf/biblioteca" },
      { icon: Sparkles, label: "Leitura Assistida", href: "/planta-leitura" },
      { icon: Upload, label: "Importar dados", href: "/importar" },
    ],
  },
  {
    label: "Comercial",
    icon: Briefcase,
    items: [
      { icon: Send, label: "Cotações", href: "/financeiro/cotacoes" },
      { icon: Network, label: "Rede de fornecedores", href: "/rede-fornecedores" },
      { icon: Truck, label: "Os meus fornecedores", href: "/financeiro/fornecedores" },
    ],
  },
  {
    label: "Financeiro",
    icon: Wallet,
    items: [
      { icon: Wallet, label: "Financeiro", href: "/financeiro" },
      { icon: BarChart3, label: "Gestão da empresa", href: "/empresa/gestao" },
      { icon: Blocks, label: "Centros de custo", href: "/empresa/centros-de-custo" },
    ],
  },
  {
    label: "Biblioteca",
    icon: Package,
    items: [
      { icon: Database, label: "Base de preços", href: "/base-precos" },
      { icon: Plug, label: "Instalações", href: "/instalacoes" },
    ],
  },
  {
    label: "Axia",
    icon: BrainCircuit,
    items: [
      { icon: BrainCircuit, label: "Agente Axia", href: "/axia" },
      { icon: ClipboardList, label: "Inbox Axia", href: "/axia/inbox" },
    ],
  },
  {
    label: "Relatórios",
    icon: BarChart3,
    items: [{ icon: BarChart3, label: "Relatórios", href: "/relatorios" }],
  },
  {
    label: "Conta",
    icon: UserCog,
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
