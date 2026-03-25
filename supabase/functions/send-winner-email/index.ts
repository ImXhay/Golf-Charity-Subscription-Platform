// @ts-ignore: Deno runtime module
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return new Response('Forbidden', { status: 405 });

  try {
    const { email, tier, pool } = await req.json();
    
    // @ts-ignore: Deno is available in the Supabase environment
    const key = Deno.env.get('RESEND_API_KEY');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${key}` 
      },
      body: JSON.stringify({
        from: 'ImpactDraw <onboarding@resend.dev>',
        to: [email],
        subject: `Winner Alert: ${tier}`,
        html: `<h1>Congratulations!</h1><p>You matched for ${tier}. Monthly pool: £${pool}. Log in to claim.</p>`
      })
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" } 
    });
  }
})