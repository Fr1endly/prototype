export const prerender = false;

import type { APIRoute } from 'astro';
import Stripe from 'stripe';

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;
  const stripe = new Stripe(runtime?.env?.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY);
  const webhookSecret = runtime?.env?.STRIPE_WEBHOOK_SECRET ?? import.meta.env.STRIPE_WEBHOOK_SECRET;

  const signature = request.headers.get('stripe-signature');
  if (!signature || !webhookSecret) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return new Response(`Webhook Error: ${message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata;

    if (!meta?.calEventTypeId || !meta?.slot || !meta?.name || !meta?.email) {
      console.error('Missing metadata on checkout session', session.id);
      return new Response('Missing booking metadata', { status: 400 });
    }

    const calApiKey = runtime?.env?.CALCOM_API_KEY ?? import.meta.env.CALCOM_API_KEY;
    if (!calApiKey) {
      console.error('CALCOM_API_KEY not configured');
      return new Response('Cal.com API key not configured', { status: 500 });
    }

    const bookingPayload = {
      start: meta.slot,
      eventTypeId: Number(meta.calEventTypeId),
      attendee: {
        name: meta.name,
        email: meta.email,
        timeZone: meta.timeZone || 'America/New_York',
      },
      metadata: {
        stripeSessionId: session.id,
        paymentStatus: session.payment_status,
      },
    };

    const calRes = await fetch('https://api.cal.com/v2/bookings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${calApiKey}`,
        'Content-Type': 'application/json',
        'cal-api-version': '2024-08-13',
      },
      body: JSON.stringify(bookingPayload),
    });

    if (!calRes.ok) {
      const errBody = await calRes.text();
      console.error('Cal.com booking failed:', calRes.status, errBody);
      return new Response('Failed to create Cal.com booking', { status: 500 });
    }

    console.log('Booking created for', meta.email, 'at', meta.slot);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
