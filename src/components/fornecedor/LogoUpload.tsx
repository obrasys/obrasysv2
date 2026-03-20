import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Trash2 } from 'lucide-react';

interface LogoUploadProps {
  currentUrl?: string | null;
  onUploaded: (url: string) => void;
  /** If provided, use this userId for the storage path (for registration before auth) */
  userId?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LogoUpload({ currentUrl, onUploaded, userId: externalUserId, size = 'md' }: LogoUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uid = externalUserId || user?.id;

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  };

  const displayUrl = preview || currentUrl;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uid) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Formato inválido', description: 'Selecione uma imagem (JPG, PNG, WebP)', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Ficheiro muito grande', description: 'O logotipo deve ter no máximo 5MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      // Preview immediately
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const filePath = `${uid}/logo.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('empresa-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('empresa-logos')
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      onUploaded(publicUrl);
      toast({ title: 'Logotipo carregado!' });
    } catch (err: any) {
      setPreview(null);
      toast({ title: 'Erro ao carregar', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={`${sizeClasses[size]} rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/40 transition-colors relative group`}
        onClick={() => fileRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : displayUrl ? (
          <>
            <img src={displayUrl} alt="Logo" className="w-full h-full object-contain p-1" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <Camera className="w-5 h-5" />
            <span className="text-[10px]">Logo</span>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      <div className="text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Logotipo da empresa</p>
        <p className="text-xs">JPG, PNG ou WebP. Máx 5MB.</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {displayUrl ? 'Alterar' : 'Carregar'}
        </Button>
      </div>
    </div>
  );
}
