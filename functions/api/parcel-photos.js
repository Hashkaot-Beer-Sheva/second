const clean=v=>String(v??'').trim();
const parcelKey=v=>clean(v).replace(/\.(png|webp)$/i,'').replace(/^0+/,'');
export async function onRequestGet({env,request}){
  try{
    const q=new URL(request.url).searchParams, wanted=parcelKey(q.get('parcel'));
    if(!wanted||!env.PROPERTY_DATA?.list||!env.PROPERTY_DATA?.get)return Response.json({photos:[],hasPhotos:false});
    const listed=await env.PROPERTY_DATA.list({prefix:'parcelpics/'});
    const objects=listed.objects.filter(o=>parcelKey(o.key.split('/').pop())===wanted&&/\.webp$/i.test(o.key));
    if(q.get('image')==='1'){const key=q.get('key')||'',o=objects.find(x=>x.key===key);if(!o)return new Response('Not found',{status:404});const f=await env.PROPERTY_DATA.get(o.key);return new Response(f.body,{headers:{'content-type':f.httpMetadata?.contentType||'image/webp','cache-control':'public,max-age=31536000,immutable'}})}
    return Response.json({hasPhotos:objects.length>0,photos:objects.map(o=>({name:o.key.split('/').pop(),src:`/api/parcel-photos?image=1&parcel=${encodeURIComponent(wanted)}&key=${encodeURIComponent(o.key)}`}))});
  }catch(e){return Response.json({photos:[],hasPhotos:false,error:e.message},{status:500})}
}
