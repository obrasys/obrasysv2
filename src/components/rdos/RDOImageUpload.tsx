import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Camera, 
  Upload, 
  X, 
  Loader2, 
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RDOImageUploadProps {
  rdoId?: string;
  existingPhotos?: string[];
  onPhotosChange: (photos: string[]) => void;
  disabled?: boolean;
}

export function RDOImageUpload({ 
  rdoId, 
  existingPhotos = [], 
  onPhotosChange,
  disabled 
}: RDOImageUploadProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>(existingPhotos);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Generate signed URLs for viewing
  const getSignedUrl = async (path: string) => {
    if (signedUrls[path]) return signedUrls[path];
    
    const { data } = await supabase.storage
      .from('rdo-fotos')
      .createSignedUrl(path, 3600); // 1 hour
    
    if (data?.signedUrl) {
      setSignedUrls(prev => ({ ...prev, [path]: data.signedUrl }));
      return data.signedUrl;
    }
    return null;
  };

  // Load signed URLs for existing photos
  const loadSignedUrls = useCallback(async () => {
    for (const path of photos) {
      await getSignedUrl(path);
    }
  }, [photos]);

  // Initial load
  useState(() => {
    if (photos.length > 0) {
      loadSignedUrls();
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) return;
    
    setUploading(true);
    const newPaths: string[] = [];

    try {
      for (const file of acceptedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${user.id}/${rdoId || 'temp'}/${fileName}`;

        const { error } = await supabase.storage
          .from('rdo-fotos')
          .upload(filePath, file);

        if (error) {
          console.error('Upload error:', error);
          toast({
            title: 'Erro ao carregar imagem',
            description: error.message,
            variant: 'destructive',
          });
        } else {
          newPaths.push(filePath);
          // Get signed URL immediately
          await getSignedUrl(filePath);
        }
      }

      if (newPaths.length > 0) {
        const updatedPhotos = [...photos, ...newPaths];
        setPhotos(updatedPhotos);
        onPhotosChange(updatedPhotos);
        toast({
          title: 'Imagens carregadas',
          description: `${newPaths.length} imagem(s) carregada(s) com sucesso.`,
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: 'Erro ao carregar',
        description: 'Ocorreu um erro ao carregar as imagens.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  }, [user, rdoId, photos, onPhotosChange, toast]);

  const removePhoto = async (path: string) => {
    try {
      const { error } = await supabase.storage
        .from('rdo-fotos')
        .remove([path]);

      if (error) {
        console.error('Delete error:', error);
      }

      const updatedPhotos = photos.filter(p => p !== path);
      setPhotos(updatedPhotos);
      onPhotosChange(updatedPhotos);
      
      // Remove from signed urls
      setSignedUrls(prev => {
        const newUrls = { ...prev };
        delete newUrls[path];
        return newUrls;
      });

      toast({
        title: 'Imagem removida',
        description: 'A imagem foi removida com sucesso.',
      });
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.heic'],
    },
    maxFiles: 10,
    disabled: disabled || uploading,
  });

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          isDragActive && "border-primary bg-primary/5",
          !isDragActive && "border-muted-foreground/25 hover:border-primary/50",
          (disabled || uploading) && "opacity-50 cursor-not-allowed"
        )}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">A carregar imagens...</p>
          </div>
        ) : (
          <>
            <div className="flex justify-center gap-2 mb-3">
              <Camera className="h-6 w-6 text-muted-foreground" />
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">
              {isDragActive ? "Solte as imagens aqui" : "Arraste fotos ou clique para selecionar"}
            </p>
            <p className="text-xs text-muted-foreground">
              JPG, PNG, WEBP (máx. 10 imagens)
            </p>
          </>
        )}
      </div>

      {/* Photos Grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((path, index) => (
            <Card key={path} className="relative group overflow-hidden">
              <CardContent className="p-0">
                {signedUrls[path] ? (
                  <img
                    src={signedUrls[path]}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-24 object-cover"
                  />
                ) : (
                  <div className="w-full h-24 flex items-center justify-center bg-muted">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                {!disabled && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      removePhoto(path);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <p className="text-sm text-muted-foreground text-center py-2">
          Nenhuma foto adicionada
        </p>
      )}
    </div>
  );
}
