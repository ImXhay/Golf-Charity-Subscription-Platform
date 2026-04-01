import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

// Initialize Supabase Admin Client (Bypasses RLS for secure backend operations)
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  const signature = req.headers.get('Stripe-Signature')
  
  try {
    const body = await req.text()
    const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string
    
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature!,
      endpointSecret,
      undefined,
      cryptoProvider
    )

    // Securely handle the completed payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as any;
      const userId = session.client_reference_id;

      console.log('Payment successful for user:', userId);

      if (userId) {
        // Fetch the exact subscription end date from Stripe
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const endDate = new Date(subscription.current_period_end * 1000).toISOString();

        // Update the database securely from the server
        const { error } = await supabase
          .from('profiles')
          .update({ 
            is_subscribed: true,
            subscription_end_date: endDate // Save the real date here
          })
          .eq('id', userId);

        if (error) {
          console.error('Database update failed:', error.message);
        } else {
          console.log(`Subscription activated for ${userId}`);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
    
  } catch (err: any) {
    console.error('Webhook Error:', err.message)
    return new Response(err.message, { status: 400 })
  }
})