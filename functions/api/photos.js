const clean = v => String(v ?? '').trim();
const numberKey = v => { const m = clean(v).match(/\d+/); return m ? String(Number(m[0])) : ''; };
const folderFor = key => key.split('/').slice(0, -1).pop() || '';

export async function onRequestGet({ env, request }) {
  try {
    if (!env.APARTMENT_PICTURES?.list || !env.APARTMENT_PICTURES?.get) throw new Error('R2 binding APARTMENT_PICTURES is not configured on this Pages deployment');
    const params = new URL(request.url).searchParams;
    const yechida = clean(params.get('yechida'));
    const listed = await env.APARTMENT_PICTURES.list({ prefix: 'apartment-pics/' });
    const folders = [...new Set(listed.objects.map(o => folderFor(o.key)).filter(Boolean))];
    if (params.get('index') === '1') return Response.json({ yechidas: folders.map(numberKey).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) });
    if (!yechida) return Response.json({ photos: [] });
    const wanted = numberKey(yechida);
    const objects = listed.objects.filter(o => numberKey(folderFor(o.key)) === wanted && /\.(jpe?g|png|webp|gif)$/i.test(o.key));
    if (params.get('meta') === '1') return Response.json({ hasPhotos: objects.length > 0 });
    const photos = [];
    for (const object of objects) {
      const file = await env.APARTMENT_PICTURES.get(object.key);
      if (!file) continue;
      const type = file.httpMetadata?.contentType || `image/${object.key.split('.').pop().toLowerCase().replace('jpg', 'jpeg')}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      photos.push({ name: object.key.split('/').pop(), src: `data:${type};base64,${btoa(binary)}` });
    }
    return Response.json({ photos });
  } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
}
