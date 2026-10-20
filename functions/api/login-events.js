export async function onRequestGet({ request, env }) {
  const username = new URL(request.url).searchParams.get('username');
  if (username !== 'FE') return Response.json({ error: 'Forbidden' }, { status: 403 });
  if (!env.LOGIN_DB?.prepare) return Response.json({ error: 'LOGIN_DB is not configured' }, { status: 503 });
  const result = await env.LOGIN_DB.prepare(`SELECT id,username,logged_in_at,ip_address,country,region,city,colo,device_type,browser,operating_system,success FROM login_events ORDER BY logged_in_at DESC LIMIT 500`).all();
  return Response.json({ events: result.results || [] });
}
