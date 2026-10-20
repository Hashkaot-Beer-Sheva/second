const USERS = { Elie: 'HD', Yuri: 'HD', FE: 'HD', Leo: 'HD' };

function deviceInfo(userAgent = '') {
  const ua = userAgent.toLowerCase();
  const mobile = /android|iphone|ipad|ipod|mobile|tablet/.test(ua);
  const browser = /edg\//.test(ua) ? 'Edge' : /chrome\//.test(ua) ? 'Chrome' : /firefox\//.test(ua) ? 'Firefox' : /safari\//.test(ua) ? 'Safari' : 'Other';
  const operatingSystem = /iphone|ipad|ipod/.test(ua) ? 'iOS' : /android/.test(ua) ? 'Android' : /windows/.test(ua) ? 'Windows' : /mac os/.test(ua) ? 'macOS' : /linux/.test(ua) ? 'Linux' : 'Other';
  return { deviceType: mobile ? 'Mobile' : 'Desktop', browser, operatingSystem };
}

export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const username = String(body.username || '').trim();
    const password = String(body.password || '');
    const success = USERS[username] === password;
    const now = new Date().toISOString();
    const ua = request.headers.get('user-agent') || '';
    const info = deviceInfo(ua);
    const cf = request.cf || {};
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '';
    if (env.LOGIN_DB?.prepare) {
      await env.LOGIN_DB.prepare(`DELETE FROM login_events WHERE logged_in_at < datetime('now', '-90 days')`).run();
      await env.LOGIN_DB.prepare(`INSERT INTO login_events (username,logged_in_at,ip_address,country,region,city,colo,device_type,browser,operating_system,user_agent,success) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(username, now, ip, cf.country || '', cf.region || '', cf.city || '', cf.colo || '', info.deviceType, info.browser, info.operatingSystem, ua, success ? 1 : 0).run();
    }
    return Response.json({ ok: success, username: success ? username : null, isAdmin: success && username === 'FE' });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400 });
  }
}
