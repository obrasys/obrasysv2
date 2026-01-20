import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOKS] ${step}${detailsStr}`);
};

// Map Stripe product IDs to subscription tiers
const PRODUCT_TIERS: Record<string, string> = {
  "prod_TpRPnhC1KKSanw": "starter",
  "prod_TpRSmJ7vZTK4qf": "professional",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    let event: Stripe.Event;

    // Verify webhook signature if secret is set
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) throw new Error("No stripe-signature header");
      
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } else {
      event = JSON.parse(body) as Stripe.Event;
      logStep("Webhook received without signature verification (dev mode)");
    }

    logStep("Processing event", { type: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logStep("Checkout session completed", { 
          sessionId: session.id, 
          customerId: session.customer,
          email: session.customer_email 
        });

        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const customerId = session.customer as string;
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          
          const productId = subscription.items.data[0].price.product as string;
          const tier = PRODUCT_TIERS[productId] || "starter";
          const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

          // Find user by email
          const { data: users } = await supabaseClient.auth.admin.listUsers();
          const user = users.users.find(u => u.email === customer.email);

          if (user) {
            await supabaseClient
              .from("subscribers")
              .upsert({
                user_id: user.id,
                email: customer.email!,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscription.id,
                subscribed: true,
                subscription_tier: tier,
                subscription_status: "active",
                subscription_end: subscriptionEnd,
              }, { onConflict: "user_id" });

            logStep("Subscriber record created/updated", { userId: user.id, tier });
          } else {
            logStep("User not found for email", { email: customer.email });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription updated", { 
          subscriptionId: subscription.id, 
          status: subscription.status 
        });

        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        
        const productId = subscription.items.data[0].price.product as string;
        const tier = PRODUCT_TIERS[productId] || "starter";
        const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

        const { data: users } = await supabaseClient.auth.admin.listUsers();
        const user = users.users.find(u => u.email === customer.email);

        if (user) {
          await supabaseClient
            .from("subscribers")
            .update({
              subscription_tier: tier,
              subscription_status: subscription.status,
              subscription_end: subscriptionEnd,
              subscribed: subscription.status === "active",
            })
            .eq("user_id", user.id);

          logStep("Subscriber updated", { userId: user.id, status: subscription.status });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        logStep("Subscription canceled", { subscriptionId: subscription.id });

        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;

        const { data: users } = await supabaseClient.auth.admin.listUsers();
        const user = users.users.find(u => u.email === customer.email);

        if (user) {
          await supabaseClient
            .from("subscribers")
            .update({
              subscribed: false,
              subscription_status: "canceled",
              subscription_tier: "trial",
            })
            .eq("user_id", user.id);

          logStep("Subscriber marked as canceled", { userId: user.id });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
