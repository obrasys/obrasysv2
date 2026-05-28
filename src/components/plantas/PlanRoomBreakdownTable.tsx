import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, LayoutGrid } from "lucide-react";
import type { PerRoomAnalysis } from "@/lib/plan-room-analysis";

interface Props {
  rows: PerRoomAnalysis[];
  onRename: (roomId: string, newName: string) => void | Promise<void>;
}

export function PlanRoomBreakdownTable({ rows, onRename }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");

  if (rows.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-primary" />
            Quadro discriminativo por compartimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground py-6 text-center">
            Quando a Axia detetar compartimentos (ou os desenhar manualmente), aparecem aqui.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totals = rows.reduce(
    (acc, r) => {
      acc.area += r.area_m2;
      acc.baseboard += r.baseboard_m;
      acc.walls += r.walls_m2;
      return acc;
    },
    { area: 0, baseboard: 0, walls: 0 },
  );

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setDraftName(current);
  };

  const commitEdit = async (id: string) => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== rows.find((r) => r.room_id === id)?.name) {
      await onRename(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <Card className="rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-primary" />
          Quadro discriminativo por compartimento
          <span className="ml-auto text-[11px] font-normal text-muted-foreground">
            {rows.length} compartimento{rows.length > 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[28%]">Compartimento</TableHead>
              <TableHead className="text-right">Área (m²)</TableHead>
              <TableHead className="text-right">Rodapé (m)</TableHead>
              <TableHead className="text-right">Paredes (m²)</TableHead>
              <TableHead>Elementos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.room_id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: r.color }}
                    />
                    {editingId === r.room_id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          autoFocus
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(r.room_id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          onBlur={() => commitEdit(r.room_id)}
                          className="h-7 text-sm"
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); commitEdit(r.room_id); }}>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => { e.preventDefault(); setEditingId(null); }}>
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(r.room_id, r.name)}
                        className="group flex items-center gap-1.5 text-left text-sm font-medium hover:text-primary transition-colors"
                        title="Clicar para renomear"
                      >
                        {r.name}
                        <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60" />
                      </button>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.area_m2.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.baseboard_m.toFixed(2)}</TableCell>
                <TableCell className="text-right tabular-nums">{r.walls_m2.toFixed(2)}</TableCell>
                <TableCell>
                  {r.elements.length === 0 ? (
                    <span className="text-xs text-muted-foreground">-</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {r.elements.map((el, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded-md bg-muted text-foreground"
                        >
                          {el.qtd}× {el.tipo === "porta" ? "Porta" : "Janela"} {el.largura_cm}×{el.altura_cm}
                        </span>
                      ))}
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="text-xs uppercase tracking-wide text-muted-foreground">Totais</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{totals.area.toFixed(2)}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{totals.baseboard.toFixed(2)}</TableCell>
              <TableCell className="text-right tabular-nums font-semibold">{totals.walls.toFixed(2)}</TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
