export const prerender = false;

import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url }) => {
  const eventTypeId = url.searchParams.get('eventTypeId');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');
  const timeZone = url.searchParams.get('timeZone') ?? 'America/New_York';

  if (!eventTypeId || !start || !end) {
    return new Response(
      JSON.stringify({ error: 'Missing required params: eventTypeId, start, end' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const apiKey = import.meta.env.CALCOM_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'Cal.com API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const params = new URLSearchParams({
    eventTypeId,
    start: start.slice(0, 10),
    end: end.slice(0, 10),
    timeZone,
  });

  const calRes = await fetch(`https://api.cal.com/v2/slots?${params}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'cal-api-version': '2024-09-04',
    },
  });

  // log response for debugging
  // console.log('Cal.com API response status:', calRes.status);
  // console.log('Cal.com API response body:', await calRes.clone().text());



  const calData = await calRes.json();

  if (!calRes.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch slots' }), {
      status: calRes.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Cal.com v2 may return { status, data: { slots: {...} } } or the flat { "date": [...] } directly
  const slots = calData?.data?.slots ?? calData;

  return new Response(JSON.stringify({ slots }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
