export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const POST: APIRoute = async ({ request, url, locals }) => {
  const runtime = (locals as any).runtime;
  const stripe = new Stripe(runtime?.env?.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY);

  let body: {
    stripePriceId: string;
    calEventTypeId: number;
    slot: string;
    name: string;
    email: string;
    timeZone: string;
    serviceSlug: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { stripePriceId, calEventTypeId, slot, name, email, timeZone, serviceSlug } = body;

  if (!stripePriceId || !calEventTypeId || !slot || !name || !email || !timeZone) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const origin = url.origin;

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [{ price: stripePriceId, quantity: 1 }],
    metadata: {
      calEventTypeId: String(calEventTypeId),
      slot,
      name,
      email,
      timeZone,
      serviceSlug,
    },
    success_url: `${origin}/booking/success/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/booking/cancel/?service=${serviceSlug}`,
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
