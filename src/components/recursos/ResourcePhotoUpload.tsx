import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ResourcePhotoUploadProps {
  currentUrl?: string | null;
  fallbackInitials: string;
  onUpload: (url: string) => void;
  className?: string;
}

export function ResourcePhotoUpload({
  currentUrl,
  fallbackInitials,
  onUpload,
  className = '',
}: ResourcePhotoUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Apenas ficheiros de imagem são permitidos');
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from('recursos')
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error('Erro ao carregar imagem');
      console.error(error);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('recursos')
      .getPublicUrl(path);

    onUpload(urlData.publicUrl);
    setUploading(false);
  };

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative group cursor-pointer" onClick={() => inputRef.current?.click()}>
        <Avatar className="h-20 w-20 border-2 border-border">
          {currentUrl && <AvatarImage src={currentUrl} alt="Foto" />}
          <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
            {fallbackInitials}
          </AvatarFallback>
        </Avatar>
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          {uploading ? (
            <Loader2 className="h-5 w-5 text-white animate-spin" />
          ) : (
            <Camera className="h-5 w-5 text-white" />
          )}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? 'A carregar...' : 'Alterar foto'}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
