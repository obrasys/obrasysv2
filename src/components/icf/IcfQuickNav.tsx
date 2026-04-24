import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Layers, Box, BarChart3 } from 'lucide-react';

interface Props {
  configId: string;
}

export const IcfQuickNav = ({ configId }: Props) => {
  const navigate = useNavigate();
  const items = [
    { icon: Layers, label: 'Panos de Parede', href: `/icf/panos/${configId}` },
    { icon: Box, label: 'Fundações', href: `/icf/fundacoes/${configId}` },
    { icon: Layers, label: 'Lajes', href: `/icf/lajes/${configId}` },
    { icon: BarChart3, label: 'Resumo Global', href: `/icf/resumo/${configId}` },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map(item => (
        <Card key={item.label} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => navigate(item.href)}>
          <CardContent className="pt-6 flex items-center gap-3">
            <item.icon className="h-8 w-8 text-primary" />
            <span className="font-medium">{item.label}</span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
