import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { SEO } from "@/components/SEO";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading, profile } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        if (profile?.role === 'cliente') {
          navigate("/portal", { replace: true });
        } else {
          navigate("/dashboard", { replace: true });
        }
      } else {
        navigate("/auth", { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
    </div>
  );
};

export default Index;
