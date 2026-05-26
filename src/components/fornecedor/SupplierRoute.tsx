import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsSupplier } from '@/hooks/useSuppliers';
import { Loader2 } from 'lucide-react';

interface SupplierRouteProps {
  children: React.ReactNode;
}

export function SupplierRoute({ children }: SupplierRouteProps) {
  const { user, loading: authLoading, mfaVerified } = useAuth();
  const { data: isSupplier, isLoading: supplierLoading } = useIsSupplier();

  const isLoading = authLoading || supplierLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/fornecedor/auth" replace />;
  }

  if (!mfaVerified) {
    return <Navigate to="/verify-2fa" replace />;
  }

  if (!isSupplier) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
