import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to generate signed URLs for private storage buckets on demand
 * @param bucket The storage bucket name
 * @param filePath The file path within the bucket (can be a full URL or just the path)
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 */
export function useSignedUrl(
  bucket: string,
  filePath: string | null | undefined,
  expiresIn: number = 3600
) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const generateSignedUrl = async () => {
      // No file path provided
      if (!filePath) {
        setSignedUrl(null);
        return;
      }

      // If it's already a full URL (legacy data), just use it directly
      // This handles old data that might have stored full public URLs
      if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        setSignedUrl(filePath);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const { data, error: signError } = await supabase.storage
          .from(bucket)
          .createSignedUrl(filePath, expiresIn);

        if (signError) {
          console.error('Error creating signed URL:', signError);
          setError(signError.message);
          setSignedUrl(null);
        } else {
          setSignedUrl(data.signedUrl);
        }
      } catch (err) {
        console.error('Error creating signed URL:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setSignedUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    generateSignedUrl();
  }, [bucket, filePath, expiresIn]);

  return { signedUrl, isLoading, error };
}

/**
 * Function to generate a signed URL on demand (for use in callbacks/events)
 * @param bucket The storage bucket name
 * @param filePath The file path within the bucket
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 */
export async function getSignedUrl(
  bucket: string,
  filePath: string | null | undefined,
  expiresIn: number = 3600
): Promise<string | null> {
  // No file path provided
  if (!filePath) {
    return null;
  }

  // If it's already a full URL (legacy data), just return it
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.error('Error creating signed URL:', err);
    return null;
  }
}
