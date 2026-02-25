import { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Users, 
  FileSpreadsheet, 
  HardHat, 
  DollarSign,
  CheckCircle2,
  Info,
  Download,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useDropzone } from 'react-dropzone';

interface ImportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  acceptedColumns: string[];
  redirectTo: string;
  color: string;
}

const IMPORT_CATEGORIES: ImportCategory[] = [
  {
    id: 'clientes',
    title: 'Clientes',
    description: 'Importe a sua lista de clientes com nome, email, telefone, NIF, empresa e morada.',
    icon: <Users className="w-6 h-6" />,
    acceptedColumns: ['nome', 'email', 'telefone', 'telemovel', 'empresa', 'nif', 'endereco', 'cidade', 'codigo_postal'],
    redirectTo: '/clientes',
    color: 'bg-blue-100 text-blue-600',
  },
  {
    id: 'artigos',
    title: 'Artigos / Base de Preços',
    description: 'Importe artigos de trabalho com código, descrição, unidade, preço unitário e categoria.',
    icon: <FileSpreadsheet className="w-6 h-6" />,
    acceptedColumns: ['codigo', 'descricao', 'unidade', 'preco_unitario', 'categoria'],
    redirectTo: '/base-precos',
    color: 'bg-emerald-100 text-emerald-600',
  },
  {
    id: 'recursos',
    title: 'Recursos Humanos',
    description: 'Importe membros da equipa com nome, cargo, email, telefone, NIF e tipo de contrato.',
    icon: <HardHat className="w-6 h-6" />,
    acceptedColumns: ['nome', 'cargo', 'email', 'telefone', 'nif', 'tipo_contrato', 'salario_base'],
    redirectTo: '/recursos',
    color: 'bg-orange-100 text-orange-600',
  },
  {
    id: 'fornecedores',
    title: 'Tabela de Preços / Fornecedores',
    description: 'Importe fornecedores com nome, email, telefone, NIF, endereço e especialidade.',
    icon: <DollarSign className="w-6 h-6" />,
    acceptedColumns: ['nome', 'email', 'telefone', 'nif', 'endereco', 'especialidade'],
    redirectTo: '/financeiro/fornecedores',
    color: 'bg-purple-100 text-purple-600',
  },
];

export default function ImportarPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>({});

  const handleFileDrop = (categoryId: string, acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
      ];
      if (!validTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        toast.error('Formato inválido. Use ficheiros .xlsx, .xls ou .csv');
        return;
      }
      setUploadedFiles(prev => ({ ...prev, [categoryId]: file }));
      toast.success(`Ficheiro "${file.name}" carregado com sucesso!`);
    }
  };

  const handleRemoveFile = (categoryId: string) => {
    setUploadedFiles(prev => ({ ...prev, [categoryId]: null }));
  };

  return (
    <AppLayout
      title="Importar Dados"
      subtitle="Faça upload dos seus ficheiros Excel ou CSV para importar dados para a plataforma"
    >
      <div className="p-4 md:p-6 space-y-6">
        {/* Info Banner */}
        <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
          <CardContent className="flex items-start gap-3 pt-6">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Como funciona a importação?
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Selecione a categoria de dados que pretende importar, faça upload do seu ficheiro Excel (.xlsx, .xls) ou CSV (.csv),
                e os dados serão processados automaticamente. Certifique-se que as colunas do ficheiro correspondem aos campos indicados.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Import Categories */}
        <div className="grid gap-4 md:grid-cols-2">
          {IMPORT_CATEGORIES.map((category) => (
            <ImportCategoryCard
              key={category.id}
              category={category}
              file={uploadedFiles[category.id] || null}
              isSelected={selectedCategory === category.id}
              onSelect={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              onDrop={(files) => handleFileDrop(category.id, files)}
              onRemoveFile={() => handleRemoveFile(category.id)}
              onNavigate={() => navigate(category.redirectTo)}
            />
          ))}
        </div>
      </div>
    </AppLayout>
  );
}

interface ImportCategoryCardProps {
  category: ImportCategory;
  file: File | null;
  isSelected: boolean;
  onSelect: () => void;
  onDrop: (files: File[]) => void;
  onRemoveFile: () => void;
  onNavigate: () => void;
}

function ImportCategoryCard({ category, file, isSelected, onSelect, onDrop, onRemoveFile, onNavigate }: ImportCategoryCardProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
  });

  return (
    <Card 
      className={`transition-all cursor-pointer hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary shadow-md' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${category.color}`}>
              {category.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{category.title}</CardTitle>
              <CardDescription className="mt-1">{category.description}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Accepted columns */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Colunas aceites:</p>
          <div className="flex flex-wrap gap-1.5">
            {category.acceptedColumns.map((col) => (
              <Badge key={col} variant="secondary" className="text-xs font-mono">
                {col}
              </Badge>
            ))}
          </div>
        </div>

        {/* Upload Zone */}
        {isSelected && (
          <div className="space-y-3 pt-2">
            {!file ? (
              <div
                {...getRootProps()}
                onClick={(e) => e.stopPropagation()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive 
                    ? 'border-primary bg-primary/5' 
                    : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {isDragActive ? 'Solte o ficheiro aqui...' : 'Arraste o ficheiro ou clique para selecionar'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Formatos: .xlsx, .xls, .csv
                </p>
              </div>
            ) : (
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={onRemoveFile}
                    >
                      Remover
                    </Button>
                    <Button 
                      size="sm"
                      onClick={onNavigate}
                    >
                      Importar
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
