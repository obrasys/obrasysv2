import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  validateClientData,
  mapRowToClient,
  type ParsedCSV,
  type ValidationResult,
} from '@/lib/csv-parser';
import { parseSpreadsheetFile } from '@/lib/spreadsheet-parser';
import { useClientes } from '@/hooks/useClientes';
import type { ClienteFormData } from '@/types/clientes';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
} from 'lucide-react';

interface ImportCSVModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

const CLIENT_FIELDS = [
  { value: 'ignore', label: '-- Ignorar --' },
  { value: 'nome', label: 'Nome *' },
  { value: 'email', label: 'Email' },
  { value: 'telefone', label: 'Telefone' },
  { value: 'telemovel', label: 'Telemóvel' },
  { value: 'empresa', label: 'Empresa' },
  { value: 'nif', label: 'NIF' },
  { value: 'endereco', label: 'Morada' },
  { value: 'codigo_postal', label: 'Código Postal' },
  { value: 'cidade', label: 'Cidade' },
  { value: 'pais', label: 'País' },
  { value: 'observacoes', label: 'Observações' },
];

export function ImportCSVModal({ open, onOpenChange, onSuccess }: ImportCSVModalProps) {
  const { createCliente } = useClientes();
  
  const [step, setStep] = useState<Step>('upload');
  const [csvData, setCsvData] = useState<ParsedCSV | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const [isImporting, setIsImporting] = useState(false);

  const resetState = useCallback(() => {
    setStep('upload');
    setCsvData(null);
    setMapping({});
    setValidation(null);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0 });
    setIsImporting(false);
  }, []);

  const handleClose = () => {
    resetState();
    onOpenChange(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const parsed = await parseSpreadsheetFile(file);

    setCsvData(parsed);

    // Auto-map columns based on header names
    const autoMapping: Record<string, string> = {};
    parsed.headers.forEach(header => {
      const h = header.toLowerCase().trim();

      if (h.includes('empresa') || h.includes('company') || h.includes('razão') || h.includes('razao')) {
        autoMapping[header] = 'empresa';
      } else if (h === 'nome' || h.includes('nome') || h.includes('responsável') || h.includes('responsavel') || h === 'name') {
        autoMapping[header] = 'nome';
      } else if (h.includes('email') || h.includes('e-mail') || h.includes('mail')) {
        autoMapping[header] = 'email';
      } else if (h.includes('telemovel') || h.includes('telemóvel') || h.includes('mobile') || h.includes('tlm')) {
        autoMapping[header] = 'telemovel';
      } else if (h.includes('telefone') || h.includes('phone') || h.includes('tel') || h.includes('fixo') || h.includes('tlf') || h.includes('contacto')) {
        autoMapping[header] = 'telefone';
      } else if (h.includes('nif') || h.includes('contribuinte') || h.includes('vat')) {
        autoMapping[header] = 'nif';
      } else if (h.includes('morada') || h.includes('endereco') || h.includes('endereço') || h.includes('address')) {
        autoMapping[header] = 'endereco';
      } else if (h.includes('codigo postal') || h.includes('código postal') || h === 'cp' || h.includes('zip')) {
        autoMapping[header] = 'codigo_postal';
      } else if (h.includes('cidade') || h.includes('localidade') || h.includes('city')) {
        autoMapping[header] = 'cidade';
      } else if (h.includes('pais') || h.includes('país') || h.includes('country')) {
        autoMapping[header] = 'pais';
      } else if (h.includes('observ') || h.includes('notas') || h.includes('notes') || h.includes('especialidade') || h.includes('categoria')) {
        autoMapping[header] = 'observacoes';
      } else {
        autoMapping[header] = 'ignore';
      }
    });

    setMapping(autoMapping);
    setStep('mapping');
  };

  const handleMappingChange = (csvColumn: string, clientField: string) => {
    setMapping(prev => ({ ...prev, [csvColumn]: clientField }));
  };

  const handleValidate = () => {
    if (!csvData) return;
    
    const result = validateClientData(csvData.rawData, mapping);
    setValidation(result);
    setStep('preview');
  };

  const handleImport = async () => {
    if (!csvData || !validation) return;
    
    setIsImporting(true);
    setStep('importing');
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < csvData.rawData.length; i++) {
      const row = csvData.rawData[i];
      const mappedData = mapRowToClient(row, mapping);

      // Fallback: if no nome but empresa exists, use empresa as nome
      if (!mappedData.nome && mappedData.empresa) {
        mappedData.nome = mappedData.empresa;
      }

      // Skip rows without nome
      if (!mappedData.nome) {
        failed++;
        setImportProgress(((i + 1) / csvData.rawData.length) * 100);
        continue;
      }
      
      const clientData: ClienteFormData = {
        nome: mappedData.nome,
        email: mappedData.email,
        telefone: mappedData.telefone,
        telemovel: mappedData.telemovel,
        empresa: mappedData.empresa,
        nif: mappedData.nif,
        endereco: mappedData.endereco,
        codigo_postal: mappedData.codigo_postal,
        cidade: mappedData.cidade,
        pais: mappedData.pais,
        observacoes: mappedData.observacoes,
      };
      
      try {
        await createCliente.mutateAsync(clientData);
        success++;
      } catch (error) {
        failed++;
      }
      
      setImportProgress(((i + 1) / csvData.rawData.length) * 100);
      setImportResults({ success, failed });
    }
    
    setIsImporting(false);
    setStep('complete');
    onSuccess?.();
  };

  const downloadTemplate = () => {
    const headers = ['Nome', 'Email', 'Telemóvel', 'Telefone', 'Empresa', 'NIF', 'Morada', 'Código Postal', 'Cidade', 'País', 'Observações'];
    const exampleRow = ['João Silva', 'joao@exemplo.pt', '912345678', '211234567', 'Empresa Lda', '123456789', 'Rua das Flores 123', '1000-001', 'Lisboa', 'Portugal', 'Cliente VIP'];
    
    const csvContent = [headers.join(';'), exampleRow.join(';')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'template_clientes.csv';
    link.click();
    
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Clientes via CSV
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Carregue um ficheiro CSV com os dados dos clientes'}
            {step === 'mapping' && 'Mapeie as colunas do CSV para os campos de cliente'}
            {step === 'preview' && 'Reveja os dados antes de importar'}
            {step === 'importing' && 'A importar clientes...'}
            {step === 'complete' && 'Importação concluída'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-6 py-4">
              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <Label htmlFor="csv-upload" className="cursor-pointer">
                  <span className="text-lg font-medium">Clique para carregar</span>
                  <p className="text-sm text-muted-foreground mt-1">
                    ou arraste o ficheiro CSV aqui
                  </p>
                </Label>
                <Input
                  id="csv-upload"
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
              
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" onClick={downloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Descarregar Template
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  O ficheiro deve estar em formato CSV com cabeçalhos na primeira linha.
                  Separadores suportados: vírgula (,), ponto e vírgula (;), tab.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Step 2: Mapping */}
          {step === 'mapping' && csvData && (
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {csvData.headers.length} colunas encontradas • {csvData.rawData.length} linhas de dados
                </p>
                <Badge variant="secondary">
                  {Object.values(mapping).filter(v => v !== 'ignore').length} campos mapeados
                </Badge>
              </div>

              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">Coluna CSV</TableHead>
                      <TableHead className="w-[200px]">Campo Cliente</TableHead>
                      <TableHead>Exemplo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvData.headers.map((header, index) => (
                      <TableRow key={header}>
                        <TableCell className="font-medium">{header}</TableCell>
                        <TableCell>
                          <Select
                            value={mapping[header] || 'ignore'}
                            onValueChange={(value) => handleMappingChange(header, value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover">
                              {CLIENT_FIELDS.map((field) => (
                                <SelectItem key={field.value} value={field.value}>
                                  {field.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-muted-foreground truncate max-w-[200px]">
                          {csvData.rawData[0]?.[header] || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {!Object.values(mapping).includes('nome') && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    O campo "Nome" é obrigatório. Por favor mapeie uma coluna para o nome.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && validation && csvData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{csvData.rawData.length}</p>
                  <p className="text-sm text-muted-foreground">Total de linhas</p>
                </div>
                <div className="border rounded-lg p-4 text-center border-green-200 bg-green-50">
                  <p className="text-2xl font-bold text-green-600">{validation.validRows}</p>
                  <p className="text-sm text-muted-foreground">Válidas</p>
                </div>
                <div className="border rounded-lg p-4 text-center border-red-200 bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{validation.invalidRows}</p>
                  <p className="text-sm text-muted-foreground">Com erros</p>
                </div>
              </div>

              {validation.errors.length > 0 && (
                <ScrollArea className="h-[200px] border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">Linha</TableHead>
                        <TableHead className="w-[120px]">Campo</TableHead>
                        <TableHead>Erro</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validation.errors.slice(0, 50).map((error, index) => (
                        <TableRow key={index}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{error.field}</Badge>
                          </TableCell>
                          <TableCell className="text-red-600">{error.message}</TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[150px]">
                            {error.value || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}

              {validation.validRows === 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Nenhuma linha válida para importar. Por favor corrija os erros.
                  </AlertDescription>
                </Alert>
              )}

              {validation.validRows > 0 && validation.invalidRows > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Apenas as {validation.validRows} linhas válidas serão importadas.
                    As linhas com erros serão ignoradas.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 4: Importing */}
          {step === 'importing' && (
            <div className="space-y-6 py-8">
              <div className="text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">A importar clientes...</p>
                <p className="text-sm text-muted-foreground">
                  {importResults.success + importResults.failed} de {csvData?.rawData.length || 0}
                </p>
              </div>
              
              <Progress value={importProgress} className="h-2" />
              
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{importResults.success}</p>
                  <p className="text-sm text-muted-foreground">Importados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{importResults.failed}</p>
                  <p className="text-sm text-muted-foreground">Falhados</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 'complete' && (
            <div className="space-y-6 py-8 text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
              <div>
                <p className="text-xl font-bold">Importação Concluída!</p>
                <p className="text-muted-foreground mt-2">
                  {importResults.success} clientes importados com sucesso.
                  {importResults.failed > 0 && ` ${importResults.failed} falharam.`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with navigation buttons */}
        <div className="flex justify-between pt-4 border-t">
          <div>
            {step === 'mapping' && (
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
            {step === 'preview' && (
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            {step !== 'complete' && step !== 'importing' && (
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
            )}
            
            {step === 'mapping' && (
              <Button 
                onClick={handleValidate}
                disabled={!Object.values(mapping).includes('nome')}
              >
                Validar Dados
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            
            {step === 'preview' && validation && (
              <Button 
                onClick={handleImport}
                disabled={validation.validRows === 0 || isImporting}
              >
                Importar {validation.validRows} Clientes
                <Check className="ml-2 h-4 w-4" />
              </Button>
            )}
            
            {step === 'complete' && (
              <Button onClick={handleClose}>
                Concluir
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
