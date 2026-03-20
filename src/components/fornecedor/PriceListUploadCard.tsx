import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileSpreadsheet, FileText, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const ACCEPTED_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/csv': ['.csv'],
};

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url?: string;
  status: 'uploading' | 'done' | 'error';
}

export function PriceListUploadCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user?.id) return;

    for (const file of acceptedFiles) {
      const entry: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
        status: 'uploading',
      };
      setFiles(prev => [...prev, entry]);

      const filePath = `${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('supplier-pricelists')
        .upload(filePath, file);

      if (error) {
        setFiles(prev =>
          prev.map(f => f.name === file.name && f.status === 'uploading'
            ? { ...f, status: 'error' }
            : f
          )
        );
        toast({
          title: 'Erro ao carregar ficheiro',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        setFiles(prev =>
          prev.map(f => f.name === file.name && f.status === 'uploading'
            ? { ...f, status: 'done', url: filePath }
            : f
          )
        );
        toast({ title: `${file.name} carregado com sucesso` });
      }
    }
  }, [user?.id, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 20 * 1024 * 1024,
    multiple: true,
  });

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name));
  };

  const getFileIcon = (type: string) => {
    if (type === 'application/pdf') return <FileText className="h-4 w-4 text-red-500" />;
    return <FileSpreadsheet className="h-4 w-4 text-green-600" />;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Carregar Tabela de Preços
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Envie a sua tabela de preços em PDF, Excel (.xls/.xlsx) ou CSV para facilitar pedidos de cotação.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/30'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">
            {isDragActive ? 'Largue aqui...' : 'Arraste ficheiros ou clique para selecionar'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">PDF</Badge>
            <Badge variant="secondary" className="text-xs">XLS</Badge>
            <Badge variant="secondary" className="text-xs">XLSX</Badge>
            <Badge variant="secondary" className="text-xs">CSV</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Máximo 20MB por ficheiro</p>
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.name}
                className="flex items-center gap-3 p-2 rounded-md bg-muted/50 text-sm"
              >
                {getFileIcon(file.type)}
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                {file.status === 'uploading' && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {file.status === 'done' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                {file.status === 'error' && <Badge variant="destructive" className="text-xs">Erro</Badge>}
                <button onClick={() => removeFile(file.name)} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate('/fornecedor/precos')}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Gerir tabelas de preços manualmente
        </Button>
      </CardContent>
    </Card>
  );
}
