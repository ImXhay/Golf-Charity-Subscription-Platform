import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
  apiVersion: '2022-11-15',
  httpClient: Stripe.createFetchHttpClient(),
})

const cryptoProvider = Stripe.createSubtleCryptoProvider()

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

    if (event.type === 'checkout.session.completed') {
      console.log('Payment successful:', event.data.object)
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 })
    
  } catch (err) {
    console.error('Webhook Error:', err.message)
    return new Response(err.message, { status: 400 })
  }
})