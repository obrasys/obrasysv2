import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileSpreadsheet, 
  Check, 
  AlertTriangle, 
  Download, 
  Loader2,
  X,
} from 'lucide-react';
import { parseCSV, detectDelimiter, type ParsedCSV } from '@/lib/csv-parser';
import { useFornecedores } from '@/hooks/useFinanceiro';
import type { FornecedorFormData } from '@/types/financeiro';

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

const FORNECEDOR_FIELDS = [
  { value: 'nome', label: 'Nome', required: true },
  { value: 'email', label: 'Email', required: false },
  { value: 'telefone', label: 'Telefone', required: false },
  { value: 'endereco', label: 'Endereço', required: false },
  { value: 'nif', label: 'NIF', required: false },
  { value: 'ignore', label: '(Ignorar)', required: false },
];

interface ImportFornecedoresModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ImportFornecedoresModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportFornecedoresModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [isImporting, setIsImporting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const { createFornecedor } = useFornecedores();

  const resetState = () => {
    setStep('upload');
    setCsvData(null);
    setMapping({});
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
    setIsImporting(false);
    setErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const delimiter = detectDelimiter(content);
      const parsed = parseCSV(content, { delimiter });
      setCsvData(parsed);

      // Auto-map columns
      const autoMapping: Record<string, string> = {};
      parsed.headers.forEach((header) => {
        const normalizedHeader = header.toLowerCase().trim();
        if (normalizedHeader.includes('nome') || normalizedHeader.includes('name')) {
          autoMapping[header] = 'nome';
        } else if (normalizedHeader.includes('email') || normalizedHeader.includes('mail')) {
          autoMapping[header] = 'email';
        } else if (normalizedHeader.includes('telefone') || normalizedHeader.includes('phone') || normalizedHeader.includes('tel')) {
          autoMapping[header] = 'telefone';
        } else if (normalizedHeader.includes('endereco') || normalizedHeader.includes('morada') || normalizedHeader.includes('address')) {
          autoMapping[header] = 'endereco';
        } else if (normalizedHeader.includes('nif') || normalizedHeader.includes('contribuinte')) {
          autoMapping[header] = 'nif';
        }
      });
      setMapping(autoMapping);
      setStep('mapping');
    };
    reader.readAsText(file);
  };

  const validateMapping = (): string[] => {
    const errors: string[] = [];
    const hasNome = Object.values(mapping).includes('nome');
    if (!hasNome) {
      errors.push('O campo "Nome" é obrigatório e deve ser mapeado');
    }
    return errors;
  };

  const handleValidate = () => {
    const validationErrors = validateMapping();
    setErrors(validationErrors);
    if (validationErrors.length === 0) {
      setStep('preview');
    }
  };

  const mapRowToFornecedor = (row: Record<string, string>): FornecedorFormData | null => {
    let nome = '';
    let email: string | undefined;
    let telefone: string | undefined;
    let endereco: string | undefined;
    let nif: string | undefined;

    Object.entries(mapping).forEach(([csvColumn, field]) => {
      if (field && field !== 'ignore') {
        const value = row[csvColumn]?.trim();
        if (value) {
          switch (field) {
            case 'nome': nome = value; break;
            case 'email': email = value; break;
            case 'telefone': telefone = value; break;
            case 'endereco': endereco = value; break;
            case 'nif': nif = value; break;
          }
        }
      }
    });

    if (!nome) return null;
    return { nome, email, telefone, endereco, nif };
  };

  const handleImport = async () => {
    if (!csvData) return;

    setIsImporting(true);
    setStep('importing');
    setErrors([]);

    let success = 0;
    let failed = 0;
    const errorMessages: string[] = [];

    for (let i = 0; i < csvData.rawData.length; i++) {
      const row = csvData.rawData[i];
      const fornecedor = mapRowToFornecedor(row);

      if (fornecedor) {
        try {
          await createFornecedor.mutateAsync(fornecedor);
          success++;
        } catch (err) {
          failed++;
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`[ImportFornecedores] Linha ${i + 2} falhou:`, msg, fornecedor);
          errorMessages.push(`Linha ${i + 2} (${fornecedor.nome}): ${msg}`);
        }
      } else {
        failed++;
        errorMessages.push(`Linha ${i + 2}: sem nome preenchido`);
      }

      setImportProgress(Math.round(((i + 1) / csvData.rawData.length) * 100));
      setImportResults({ success, failed });
    }

    setErrors(errorMessages);
    setIsImporting(false);
    setStep('complete');
    onSuccess?.();
  };

  const downloadTemplate = () => {
    const headers = ['nome', 'email', 'telefone', 'endereco', 'nif'];
    const exampleRow = ['Fornecedor Exemplo', 'fornecedor@email.com', '912345678', 'Rua Exemplo 123', '123456789'];
    const csvContent = [headers.join(';'), exampleRow.join(';')].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_fornecedores.csv';
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Importar Fornecedores</DialogTitle>
          <DialogDescription>
            Importe fornecedores a partir de um ficheiro CSV
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="font-medium mb-1">Clique para selecionar um ficheiro CSV</p>
              <p className="text-sm text-muted-foreground">ou arraste e solte aqui</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
            <div className="flex items-center justify-center">
              <Button variant="link" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Descarregar template CSV
              </Button>
            </div>
          </div>
        )}

        {step === 'mapping' && csvData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              <span className="font-medium">{csvData.headers.length} colunas encontradas</span>
              <Badge variant="secondary">{csvData.rawData.length} registos</Badge>
            </div>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside">
                    {errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Coluna CSV</TableHead>
                    <TableHead>Amostra</TableHead>
                    <TableHead>Mapear para</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.headers.map((header) => (
                    <TableRow key={header}>
                      <TableCell className="font-medium">{header}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[150px] truncate">
                        {csvData.rawData[0]?.[header] || '-'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping[header] || ''}
                          onValueChange={(value) =>
                            setMapping((prev) => ({ ...prev, [header]: value }))
                          }
                        >
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Selecionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {FORNECEDOR_FIELDS.map((field) => (
                              <SelectItem key={field.value} value={field.value}>
                                {field.label}
                                {field.required && ' *'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button onClick={handleValidate}>
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === 'preview' && csvData && (
          <div className="space-y-4">
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                {csvData.rawData.length} fornecedores prontos para importação
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>NIF</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvData.rawData.slice(0, 10).map((row, i) => {
                    const fornecedor = mapRowToFornecedor(row);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{fornecedor?.nome || '-'}</TableCell>
                        <TableCell>{fornecedor?.email || '-'}</TableCell>
                        <TableCell>{fornecedor?.telefone || '-'}</TableCell>
                        <TableCell>{fornecedor?.nif || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
            {csvData.rawData.length > 10 && (
              <p className="text-sm text-muted-foreground text-center">
                Mostrando 10 de {csvData.rawData.length} registos
              </p>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                Voltar
              </Button>
              <Button onClick={handleImport}>
                Importar {csvData.rawData.length} fornecedores
              </Button>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="py-8 space-y-4">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
              <p className="font-medium">A importar fornecedores...</p>
              <p className="text-sm text-muted-foreground mt-1">
                {importResults.success + importResults.failed} de {csvData?.rawData.length || 0}
              </p>
            </div>
            <Progress value={importProgress} className="w-full" />
            <div className="flex justify-center gap-4 text-sm">
              <span className="text-green-600">✓ {importResults.success} sucesso</span>
              {importResults.failed > 0 && (
                <span className="text-destructive">✗ {importResults.failed} falharam</span>
              )}
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Importação concluída!</h3>
              <p className="text-muted-foreground">
                {importResults.success} fornecedores importados com sucesso
              </p>
              {importResults.failed > 0 && (
                <p className="text-sm text-destructive mt-1">
                  {importResults.failed} registos falharam
                </p>
              )}
            </div>
            {errors.length > 0 && (
              <Alert variant="destructive" className="text-left">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Detalhes dos erros:</p>
                  <ScrollArea className="h-[160px]">
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      {errors.slice(0, 50).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {errors.length > 50 && <li>… e mais {errors.length - 50}</li>}
                    </ul>
                  </ScrollArea>
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
