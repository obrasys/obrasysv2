

# Redesign da Página "Gestão de Obras" — Estilo Fiscaliza

## Conceito

Transformar a página de obras num layout executivo consistente com o Dashboard: KPIs com ícones coloridos em círculo, substituir os cards verticais por uma **tabela profissional** (como a `ObrasSummaryTable` do dashboard), e manter filtros inline.

```text
┌─────────────────────────────────────────────────┐
│  Header: "Gestão de Obras" + botão Nova Obra    │
├────────┬────────┬──────────┬────────────────────┤
│ 🔵Total│ 🟢Curso│ 🟣Concl. │ 📊Prog. Médio     │
│  KPI   │  KPI   │   KPI    │   KPI              │
├────────┴────────┴──────────┴────────────────────┤
│ Tabs: Ativas | Arquivadas                        │
├─────────────────────────────────────────────────┤
│ [🔍 Pesquisar...        ] [Filtro Estado ▼]     │
├─────────────────────────────────────────────────┤
│  Tabela: Nome | Cliente | Progresso | Data |    │
│          Valor | Status | Ações (ver/editar/...) │
│  ─ paginada, 8 por página ─                     │
└─────────────────────────────────────────────────┘
```

## Alterações

### 1. `src/pages/obras/Index.tsx` — Reescrever layout

- **KPIs**: Trocar os 4 `div` simples por cards estilo Dashboard (ícone colorido em círculo + valor grande + label), usando `Building2`, `Play`, `CheckCircle`, `TrendingUp`
- **Tabela em vez de cards**: Substituir o grid de `ObraCard` por uma tabela inline (estilo `ObrasSummaryTable`) com colunas: Nome, Cliente, Progresso (barra), Data, Valor, Status (badge), Ações (dropdown)
- **Paginação**: 8 items por página com navegação prev/next
- **Arquivadas**: Mesma tabela mas simplificada (nome, cliente, botões restaurar/eliminar)
- Remover import de `ObraCard`

### 2. `src/components/obras/ObraCard.tsx` — Manter (sem alterações)

O componente fica disponível para uso futuro mas a página principal usa tabela.

### Ficheiros

| Ficheiro | Ação |
|---|---|
| `src/pages/obras/Index.tsx` | Reescrever com KPIs estilizados + tabela paginada |

Uma única alteração de ficheiro. Sem backend, sem rotas novas.

