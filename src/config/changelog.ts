// Changelog do ObraSys
// Cada entrada corresponde a uma versão pública com as principais alterações.

export interface ChangelogEntry {
  version: string;
  date: string; // ISO ou "Mês AAAA"
  title: string;
  highlights: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '3.9',
    date: 'Junho 2026',
    title: 'Portal do Fornecedor & Cotações Diretas — Fase Final',
    highlights: [
      'Adjudicação de cotações diretas cria automaticamente compras na obra (obra_purchases) e atualiza o Forecast/EAC.',
      'Nova função SQL segura "award_direct_quote_response" com validação do builder e ligação ao orçamento original.',
      'Hook "useAwardDirectQuoteResponse" reescrito para usar RPC, garantindo atomicidade da adjudicação.',
      'Colunas "fornecedor_id" e "quote_response_id" em obra_purchases para rastreabilidade total.',
    ],
  },
  {
    version: '3.8',
    date: 'Junho 2026',
    title: 'Portal de Resposta do Fornecedor & Navegação Unificada',
    highlights: [
      'Fornecedores ligados via "tenant_supplier_links" podem agora responder a pedidos de cotação diretos.',
      'Página "Pedidos" unifica cotações legadas e pedidos diretos numa única lista pesquisável.',
      '"PedidoDetalhe" deteta automaticamente pedidos diretos e aplica o fluxo correto de submissão.',
      'Novos atalhos no menu lateral: "Os Meus Fornecedores" e "Cotações" no grupo Recursos.',
    ],
  },
  {
    version: '3.7',
    date: 'Junho 2026',
    title: 'Pedidos de Cotação Diretos a Fornecedores',
    highlights: [
      'Novo modal "DirectQuoteRequestModal" para enviar pedidos de cotação a fornecedores da empresa.',
      'Página "Cotações de Fornecedores" com gestão completa do ciclo de vida do pedido.',
      'Edge function "notify-fornecedor-quote" envia notificação por email ao fornecedor convidado.',
      'Hook "useFornecedorQuoteRequests" para criar, listar e gerir respostas.',
    ],
  },
  {
    version: '3.6',
    date: 'Junho 2026',
    title: 'Catálogo do Fornecedor no Orçamento',
    highlights: [
      'Novo diálogo "Adicionar do Catálogo" dentro do editor de orçamentos.',
      'Pesquisa em tempo real nas tabelas de preços importadas dos fornecedores.',
      'Inserção rápida de itens com preço de custo e fornecedor pré-associados.',
      'Hook "useTenantPricebookItemsSearch" com filtros por fornecedor e categoria.',
    ],
  },
  {
    version: '3.5',
    date: 'Junho 2026',
    title: 'Importação de Tabelas de Preços (Excel/PDF)',
    highlights: [
      'Novo modal "ImportPricebookModal" com pré-visualização editável antes de gravar.',
      'Suporte a Excel e PDF com extração assistida por IA.',
      'Cada fornecedor da empresa tem agora a sua tabela de preços própria ("tenant_supplier_pricebooks").',
      'Cartão do fornecedor passa a mostrar o estado da tabela de preços importada.',
    ],
  },
  {
    version: '3.4',
    date: 'Maio 2026',
    title: 'Gestão de Fornecedores Privados por Empresa',
    highlights: [
      'Criação de fornecedores privados ao tenant, independentes do diretório global.',
      'Ligações "tenant_supplier_links" para reutilização de fornecedores certificados.',
      'Nova página "Fornecedores" no módulo Financeiro com cartões ricos por fornecedor.',
      'RLS reforçada para isolamento total entre organizações.',
    ],
  },
  {
    version: '3.3',
    date: 'Maio 2026',
    title: 'Melhorias na Base de Preços & Axia IA',
    highlights: [
      'Pesquisa de preços em tempo real via Axia (Gemini Flash) na Base de Preços.',
      'Enriquecimento automático do catálogo de mais de 1200 itens.',
      'Validação cruzada de medições em planta contra o histórico da empresa.',
      'Correções de estabilidade no motor de orçamentação paramétrica.',
    ],
  },
  {
    version: '3.2',
    date: 'Maio 2026',
    title: 'Base Estável — Orçamentação & Obras',
    highlights: [
      'Motor fiscal Portugal consolidado (IVA 23% / 6% / 0%) no Orçamento Essencial.',
      'Plano Diário Operacional dentro das obras via cartões interativos.',
      'Balanço Financeiro Consolidado em tempo real por obra.',
      'Identidade visual premium com Deep Teal e Red Hat Display.',
    ],
  },
];
