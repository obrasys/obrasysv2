import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface Subscription {
  subscribed: boolean;
  subscription_tier: "trial" | "starter" | "professional" | "enterprise";
  subscription_status: "trialing" | "active" | "canceled" | "past_due";
  subscription_end: string | null;
}

export function useSubscription() {
  const { user, session } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error checking subscription:", error);
        return;
      }

      setSubscription({
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier || "trial",
        subscription_status: data.subscription_status || "trialing",
        subscription_end: data.subscription_end || null,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setSubscription(null);
      setLoading(false);
    }
  }, [user, checkSubscription]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const createCheckout = async (priceId: string, planName: string) => {
    if (!session?.access_token) {
      throw new Error("Não autenticado");
    }

    const { data, error } = await supabase.functions.invoke("create-checkout", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: { priceId, planName },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const openCustomerPortal = async () => {
    if (!session?.access_token) {
      throw new Error("Não autenticado");
    }

    const { data, error } = await supabase.functions.invoke("customer-portal", {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });

    if (error) throw error;
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const isTrialExpired = useCallback(() => {
    if (!subscription) return false;
    if (subscription.subscribed) return false;
    if (!subscription.subscription_end) return false;
    return new Date(subscription.subscription_end) < new Date();
  }, [subscription]);

  const trialDaysRemaining = useCallback(() => {
    if (!subscription?.subscription_end) return 0;
    if (subscription.subscribed) return 0;
    
    const endDate = new Date(subscription.subscription_end);
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [subscription]);

  return {
    subscription,
    loading,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    isTrialExpired,
    trialDaysRemaining,
  };
}
