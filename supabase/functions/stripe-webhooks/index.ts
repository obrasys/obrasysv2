import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  validateStripeSubscription,
} from "../_shared/stripe-helpers.ts";

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
  // Current live products (Obra Sys 2026 pricing: 29€ / 99€ / 179€)
  "prod_UjWLBCby5zhLab": "starter",       // STRIPE_PRICE_STARTER_MONTHLY
  "prod_UjWMbiGskJiQ9H": "professional",  // STRIPE_PRICE_PROFESSIONAL_MONTHLY
  "prod_UjWNwEfMO2UegY": "promotor",      // STRIPE_PRICE_PROMOTOR_MONTHLY
  // Previous live products
  "prod_U4iBFoVt8KJkb6": "starter",
  "prod_U4iBLTVrZfpcur": "professional",
  // Legacy products
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

    // SECURITY: Always require webhook signature verification.
    // Never accept unsigned webhook events.
    if (!webhookSecret) {
      logStep("ERROR: STRIPE_WEBHOOK_SECRET is not configured - rejecting request");
      throw new Error("STRIPE_WEBHOOK_SECRET must be configured. Unsigned webhook events are not accepted.");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.text();
    let event: Stripe.Event;

    // Always verify webhook signature
    const signature = req.headers.get("stripe-signature");
    if (!signature) throw new Error("No stripe-signature header");

    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    logStep("Webhook signature verified");

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

          const validation = validateStripeSubscription(subscription);
          if (!validation.valid) {
            logStep("WARNING: subscription payload missing fields", {
              subscriptionId: validation.subscriptionId,
              missing: validation.missing,
            });
          }
          if (!validation.productId || !validation.periodEndISO) {
            logStep("SKIP checkout.session.completed: critical fields missing", {
              subscriptionId: validation.subscriptionId,
              missing: validation.missing,
            });
            return new Response(
              JSON.stringify({
                received: true,
                skipped: "stripe_subscription_incomplete",
                missing: validation.missing,
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
            );
          }

          const productId = validation.productId;
          const tier = PRODUCT_TIERS[productId] || "starter";
          const subscriptionEnd = validation.periodEndISO;

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

            // Mark trial as expired on the profile so trial banners stop showing
            await supabaseClient
              .from("profiles")
              .update({ trial_expired: true })
              .eq("user_id", user.id);

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

        const validation = validateStripeSubscription(subscription);
        if (!validation.valid) {
          logStep("WARNING: subscription.updated payload missing fields", {
            subscriptionId: validation.subscriptionId,
            missing: validation.missing,
          });
        }
        if (!validation.productId || !validation.periodEndISO) {
          logStep("SKIP customer.subscription.updated: critical fields missing", {
            subscriptionId: validation.subscriptionId,
            missing: validation.missing,
          });
          return new Response(
            JSON.stringify({
              received: true,
              skipped: "stripe_subscription_incomplete",
              missing: validation.missing,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
        const productId = validation.productId;
        const tier = PRODUCT_TIERS[productId] || "starter";
        const subscriptionEnd = validation.periodEndISO;

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

          if (subscription.status === "active") {
            await supabaseClient
              .from("profiles")
              .update({ trial_expired: true })
              .eq("user_id", user.id);
          }

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
