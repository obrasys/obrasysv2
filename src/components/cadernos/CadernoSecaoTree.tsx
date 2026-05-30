import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CadernoSecao, CadernoItem } from "@/types/cadernos";

interface CadernoSecaoTreeProps {
  secoes: CadernoSecao[];
  itens: CadernoItem[];
  selectedSecaoId: string | null;
  onSelectSecao: (secaoId: string) => void;
  onValidarSecao?: (secaoId: string) => void;
}

interface SecaoNode extends CadernoSecao {
  children: SecaoNode[];
  itemCount: number;
  validatedCount: number;
}

function buildTree(secoes: CadernoSecao[], itens: CadernoItem[]): SecaoNode[] {
  // Contar itens por seção
  const itemCounts: Record<string, { total: number; validated: number }> = {};
  for (const item of itens) {
    if (!itemCounts[item.secao_id]) {
      itemCounts[item.secao_id] = { total: 0, validated: 0 };
    }
    itemCounts[item.secao_id].total++;
    if (item.status === "validado") {
      itemCounts[item.secao_id].validated++;
    }
  }

  // Criar nós
  const nodes: SecaoNode[] = secoes.map(s => ({
    ...s,
    children: [],
    itemCount: itemCounts[s.id]?.total || 0,
    validatedCount: itemCounts[s.id]?.validated || 0,
  }));

  // Construir árvore
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const roots: SecaoNode[] = [];

  for (const node of nodes) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function SecaoTreeNode({
  node,
  level,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  onValidar,
}: {
  node: SecaoNode;
  level: number;
  selectedId: string | null;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onValidar?: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const isComplete = node.itemCount > 0 && node.validatedCount === node.itemCount;

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors",
          isSelected && "bg-primary/10 text-primary",
          !isSelected && "hover:bg-muted"
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={() => onSelect(node.id)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.id);
            }}
            className="p-0.5 hover:bg-muted-foreground/10 rounded"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}

        {hasChildren ? (
          isExpanded ? (
            <FolderOpen className="w-4 h-4 text-yellow-500" />
          ) : (
            <Folder className="w-4 h-4 text-yellow-500" />
          )
        ) : isComplete ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <div className="w-4 h-4 border-2 border-muted-foreground/30 rounded-full" />
        )}

        <span className="flex-1 truncate font-medium text-sm">
          {node.codigo}. {node.nome}
        </span>

        {node.itemCount > 0 && (
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            isComplete ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
          )}>
            {node.validatedCount}/{node.itemCount}
          </span>
        )}

        {onValidar && node.itemCount > 0 && !isComplete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onValidar(node.id);
            }}
          >
            Validar
          </Button>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children.map(child => (
            <SecaoTreeNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onValidar={onValidar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CadernoSecaoTree({
  secoes,
  itens,
  selectedSecaoId,
  onSelectSecao,
  onValidarSecao,
}: CadernoSecaoTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(secoes.map(s => s.id)));

  const tree = buildTree(secoes, itens);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (tree.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma seção encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.map(node => (
        <SecaoTreeNode
          key={node.id}
          node={node}
          level={0}
          selectedId={selectedSecaoId}
          expandedIds={expandedIds}
          onToggle={toggleExpand}
          onSelect={onSelectSecao}
          onValidar={onValidarSecao}
        />
      ))}
    </div>
  );
}
