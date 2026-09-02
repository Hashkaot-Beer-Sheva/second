const CSV_NAMES = [
  'Unified Attempt1.csv',
  'EasyRent Prod - Apartments (1).csv',
  'Hashkaot Renters zehavit.csv',
  'Beer Sheva Monthly Report- Purchases.csv',
  'New Occupancy - Occupancy.csv',
];
let cached;

const clean = (v) => String(v ?? '').trim();
const key = (v) => clean(v).replace(/[\u200e\u200f]/g, '').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').replace(/[.,]+/g, '.').toLowerCase();
const date = (v) => { const m = clean(v).match(/^([A-Za-z]{3})\s+(\d{2})$/); if (!m) return null; const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'}; return months[m[1].toLowerCase()] ? `${months[m[1].toLowerCase()]}/15/${Number(m[2]) + 2000}` : null; };
function parseCSV(text) { const rows=[]; let row=[],cell='',quoted=false; for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1]; if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue} if(c==='"'){quoted=!quoted;continue} if(!quoted&&c===','){row.push(cell);cell='';continue} if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>clean(x)))rows.push(row.map(clean));row=[];cell='';continue} cell+=c;} if(cell||row.length){row.push(cell);rows.push(row.map(clean));} const headers=rows.shift()||[]; return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']))); }
function matrix(text) { return parseCSV(text); }
async function readCSV(bucket, prefix, name) { const listed=await bucket.list({prefix}); const object=listed.objects.find(o=>o.key.toLowerCase().endsWith(name.toLowerCase())); if(!object) throw new Error(`Missing R2 file: ${prefix}${name}`); const file=await bucket.get(object.key); return file.text(); }
function buildData(raw) {
  const unified=raw.unified, easy=raw.easy, renters=raw.renters, purchases=raw.purchases, occupancy=raw.occupancy;
  const apartments=[]; const byId=new Map(), byUnit=new Map(), byEasy=new Map();
  unified.forEach(row=>{ const id=clean(Object.values(row)[0]); if(!id||byId.has(id))return; const a={id, unified:{}, easyRent:{}, renter:{}, bills:{water:[],arnona:[],gas:[]},transactions:[],rents:[],photos:[]}; for(const [k,v] of Object.entries(row))a.unified[k]=clean(v); a.unit=clean(row['EASYPROD - Appt ID']||row['NEW OCCUPANCY UNIT']||Object.values(row)[1]); a.yechida=clean(row['ZEHAVIT yechida']); apartments.push(a); byId.set(id,a); if(a.unit)byUnit.set(key(a.unit),a); if(a.yechida)byUnit.set(key(a.yechida),a); });
  easy.forEach(row=>{ const id=clean(row.UniquID||row['UniquID ']); const a=byId.get(id); if(!a)return; a.easyRent=Object.fromEntries(Object.entries(row).map(([k,v])=>[k,clean(v)])); a.address=[row.Street,row['Street Number'],row.Appt&&`Apt ${row.Appt}`,row.Entrance&&`Entrance ${row.Entrance}`].filter(Boolean).map(clean).join(', '); a.altAddress=clean(row.AltAddress); byEasy.set(id,a); });
  renters.forEach(row=>{const a=byUnit.get(key(row['יחידה']||row['ZEHAVIT yechida']));if(!a)return;a.renter=Object.fromEntries(Object.entries(row).map(([k,v])=>[k,clean(v)])); for(const [from,to,type] of [['BR','CC','water'],['CD','CO','arnona'],['CP','DA','gas']]){const headers=Object.keys(row),s=headers.indexOf(from),e=headers.indexOf(to);if(s<0||e<0)continue;headers.slice(s,e+1).forEach(h=>{const n=Number(String(row[h]).replace(/[^0-9.-]/g,''));if(n)a.bills[type].push({month:h,value:n});});}});
  purchases.forEach(row=>{const a=byEasy.get(clean(row.UNIT));if(a)a.transactions.push({...row,canonicalId:a.id,type:'Purchase'});});
  const occRows=occupancy; const headers=Object.keys(occRows[0]||{}); const unitRow=occRows[0]||{}; const addressRow=occRows[1]||{}; headers.slice(1).forEach(h=>{const a=byUnit.get(key(unitRow[h]));if(!a)return;let last=0;occRows.slice(2).forEach(r=>{const d=date(r[headers[0]]);if(!d)return;let raw=clean(r[h]),status='';if(raw.toUpperCase()==='HK')raw=String(last);else if(!/^\d/.test(raw)){status=raw.toUpperCase();raw='0';}const value=Number(String(raw).replace(/[^0-9.-]/g,''))||0;if(value)last=value;a.rents.push({date:d,value,status,label:new Date(d)<new Date()?'Rent received':'Rent expected'});});});
  for(const a of apartments){const seen=new Set();a.rents=a.rents.filter(r=>{const k=`${a.id}|${r.date}`;if(seen.has(k))return false;seen.add(k);return true}).sort((x,y)=>y.date.localeCompare(x.date));}
  return {apartments,meta:{apartmentCount:apartments.length,loadedAt:new Date().toISOString(),sources:['Unified','EasyRent','Renters','Purchases','Occupancy']}};
}
export async function onRequestGet({env,request}) { try { if(!cached) { const prefix='SPREADSHEETS/'; const texts=await Promise.all(CSV_NAMES.map(n=>readCSV(env.PROPERTY_DATA,prefix,n))); const parsed=texts.map(parseCSV); cached=buildData({unified:parsed[0],easy:parsed[1],renters:parsed[2],purchases:parsed[3],occupancy:parsed[4]}); } return Response.json(cached,{headers:{'cache-control':'private, max-age=300'}}); } catch(e) { return Response.json({error:e.message},{status:500}); } }
