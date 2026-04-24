import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Trash2 } from 'lucide-react';

interface Props {
  configs: any[];
  onDelete: (id: string) => void;
}

const statusVariant = (s: string): 'default' | 'secondary' | 'outline' => {
  if (s === 'congelado') return 'secondary';
  if (s === 'validado') return 'default';
  return 'outline';
};

export const IcfConfigsList = ({ configs, onDelete }: Props) => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Configurações</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {configs.map(c => (
          <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="font-medium text-sm">{c.nome} <Badge variant={statusVariant(c.status)} className="ml-2">{c.status}</Badge></p>
              <p className="text-xs text-muted-foreground">v{c.versao} · {c.classe_betao}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(`/icf/configuracao/${c.id}`)}>
                <Settings className="h-3 w-3" />
              </Button>
              {c.status === 'rascunho' && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(c.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
