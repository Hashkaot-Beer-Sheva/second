const clean = v => String(v ?? '').trim();
const numberKey = v => { const m = clean(v).match(/\d+/); return m ? String(Number(m[0])) : ''; };
const folderFor = key => key.split('/').slice(0, -1).pop() || '';

export async function onRequestGet({ env, request }) {
  try {
    if (!env.APARTMENT_PICTURES?.list || !env.APARTMENT_PICTURES?.get) return Response.json({ hasPhotos: false, photos: [], unavailable: true });
    const params = new URL(request.url).searchParams;
    const yechida = clean(params.get('yechida'));
    const listed = await env.APARTMENT_PICTURES.list({ prefix: 'apartment-pics/' });
    const folders = [...new Set(listed.objects.map(o => folderFor(o.key)).filter(Boolean))];
    if (params.get('index') === '1') return Response.json({ yechidas: folders.map(numberKey).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) });
    if (!yechida) return Response.json({ photos: [] });
    const wanted = numberKey(yechida);
    const objects = listed.objects.filter(o => numberKey(folderFor(o.key)) === wanted && /\.(jpe?g|png|webp|gif)$/i.test(o.key));
    if (params.get('meta') === '1') return Response.json({ hasPhotos: objects.length > 0 });
    if (params.get('image') === '1') {
      const requestedKey = params.get('key') || '';
      const object = objects.find(item => item.key === requestedKey);
      if (!object) return new Response('Not found', { status: 404 });
      const file = await env.APARTMENT_PICTURES.get(object.key);
      if (!file) return new Response('Not found', { status: 404 });
      const headers = new Headers({ 'content-type': file.httpMetadata?.contentType || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' });
      return new Response(file.body, { headers });
    }
    const photos = [];
    for (const object of objects) {
      photos.push({ name: object.key.split('/').pop(), src: `/api/photos?image=1&yechida=${encodeURIComponent(yechida)}&key=${encodeURIComponent(object.key)}` });
    }
    return Response.json({ photos });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
