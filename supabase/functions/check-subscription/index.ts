import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Map Stripe product IDs to subscription tiers
const PRODUCT_TIERS: Record<string, string> = {
  "prod_TpRPnhC1KKSanw": "starter",
  "prod_TpRSmJ7vZTK4qf": "professional",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    
    // Use getClaims for JWT validation with signing keys
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      logStep("Authentication failed", { message: claimsError?.message });
      return new Response(JSON.stringify({ error: claimsError?.message || 'Invalid token' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string;
    
    if (!userId || !userEmail) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId, email: userEmail });
    
    // Create user object for compatibility with rest of function
    const user = { id: userId, email: userEmail };

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check local subscriber record first for founder/lifetime plans
    const { data: subscriber } = await supabaseClient
      .from("subscribers")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If user is a founder, return immediately regardless of Stripe
    if (subscriber?.subscription_tier === "founder") {
      logStep("Founder user detected", { userId: user.id });
      return new Response(JSON.stringify({
        subscribed: true,
        subscription_tier: "founder",
        subscription_status: "active",
        subscription_end: subscriber.subscription_end,
        is_founder: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });



    if (customers.data.length === 0) {
      logStep("No Stripe customer found, checking local subscriber record");

      if (subscriber) {
        return new Response(JSON.stringify({
          subscribed: false,
          subscription_tier: subscriber.subscription_tier,
          subscription_status: subscriber.subscription_status,
          subscription_end: subscriber.subscription_end,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Fallback: Check profiles table for trial_end
      logStep("No subscriber record found, checking profiles table");
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("trial_end, trial_expired")
        .eq("user_id", user.id)
        .single();

      if (profile?.trial_end) {
        logStep("Found trial info in profiles", { trial_end: profile.trial_end });
        return new Response(JSON.stringify({
          subscribed: false,
          subscription_tier: "trial",
          subscription_status: profile.trial_expired ? "canceled" : "trialing",
          subscription_end: profile.trial_end,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = "trial";
    let subscriptionEnd = null;
    let subscriptionStatus = "trialing";
    let productId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date((subscription as any).current_period_end * 1000).toISOString();
      productId = subscription.items.data[0].price.product as string;
      subscriptionTier = PRODUCT_TIERS[productId] || "starter";
      subscriptionStatus = "active";
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        tier: subscriptionTier 
      });

      // Update local subscriber record
      await supabaseClient
        .from("subscribers")
        .upsert({
          user_id: user.id,
          email: user.email,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          subscribed: true,
          subscription_tier: subscriptionTier,
          subscription_status: "active",
          subscription_end: subscriptionEnd,
        }, { onConflict: "user_id" });

      logStep("Subscriber record updated");
    } else {
      logStep("No active subscription found, checking local records");
      
      // Fallback to local subscriber/profile data for trial info
      const { data: subscriber } = await supabaseClient
        .from("subscribers")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (subscriber) {
        subscriptionTier = subscriber.subscription_tier || "trial";
        subscriptionEnd = subscriber.subscription_end;
        subscriptionStatus = subscriber.subscription_status || "trialing";
      } else {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("trial_end, trial_expired")
          .eq("user_id", user.id)
          .single();

        if (profile?.trial_end) {
          subscriptionEnd = profile.trial_end;
          subscriptionStatus = profile.trial_expired ? "canceled" : "trialing";
        }
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_status: subscriptionStatus,
      subscription_end: subscriptionEnd,
      product_id: productId,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
