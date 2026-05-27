import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Box, BarChart3, BookOpen, LayoutGrid, FileText } from 'lucide-react';

interface Props {
  configId: string;
}

export const IcfQuickNav = ({ configId }: Props) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const obra = params.get('obra');
  const obraQs = obra ? `?obra=${obra}` : '';
  const items = [
    { icon: Layers, label: 'Panos de Parede', href: `/icf/panos/${configId}` },
    { icon: Box, label: 'Fundações', href: `/icf/fundacoes/${configId}` },
    { icon: Layers, label: 'Lajes', href: `/icf/lajes/${configId}` },
    { icon: BarChart3, label: 'Resumo Global', href: `/icf/resumo/${configId}` },
    { icon: BookOpen, label: 'Biblioteca Técnica', href: `/icf/biblioteca` },
    { icon: LayoutGrid, label: 'Mapa Visual de Panos', href: `/icf/mapa-visual${obraQs}` },
    { icon: FileText, label: 'Manual ICF', href: `/icf/manual${obraQs}` },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <Card key={item.label} className="cursor-pointer hover:border-primary/50 transition-colors rounded-xl" onClick={() => navigate(item.href)}>
          <CardContent className="pt-6 flex items-center gap-3">
            <item.icon className="h-7 w-7 text-primary" />
            <span className="font-medium text-sm">{item.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
