const CSV_NAMES = [
  'Unified Attempt1.csv',
  'EasyRent Prod - Apartments (1).csv',
  'Hashkaot Renters zehavit.csv',
  'Beer Sheva Monthly Report- Purchases.csv',
  'New Occupancy - Occupancy.csv',
  'building-coordinates (4) (1).csv',
];
let cached;

const clean = (v) => String(v ?? '').trim();
const key = (v) => clean(v).replace(/[\u200e\u200f]/g, '').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').replace(/[.,]+/g, '.').toLowerCase();
const date = (v) => { const m = clean(v).match(/^([A-Za-z]{3})\s+(\d{2})$/); if (!m) return null; const months = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'}; return months[m[1].toLowerCase()] ? `${months[m[1].toLowerCase()]}/15/${Number(m[2]) + 2000}` : null; };
const leaseDate = v => { const raw=clean(v),m=raw.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/); if(m){const y=Number(m[3])<100?2000+Number(m[3]):Number(m[3]);return new Date(y,Number(m[2])-1,Number(m[1])).getTime();} const t=Date.parse(raw); return Number.isNaN(t)?0:t; };
const ownerGroup = (owner) => /השקעות דרום|וייס זאב דוד/.test(owner||'') ? 'Weiss' : /קרן אבירם|מוריס דוד דניאל|קרן אבירם בעמ|רוקון נאמנים/.test(owner||'') ? 'Morris' : 'Other';
export function parseMatrix(text) { const rows=[]; let row=[],cell='',quoted=false; for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1]; if(c==='"'&&quoted&&n==='"'){cell+='"';i++;continue} if(c==='"'){quoted=!quoted;continue} if(!quoted&&c===','){row.push(cell);cell='';continue} if(!quoted&&(c==='\n'||c==='\r')){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>clean(x)))rows.push(row.map(clean));row=[];cell='';continue} cell+=c;} if(cell||row.length){row.push(cell);rows.push(row.map(clean));} return rows; }
export function parseCSV(text) { const rows=parseMatrix(text); const headers=rows.shift()||[]; return rows.map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']))); }
export function parseCSVFromRow(text,index=0) { const rows=parseMatrix(text),headers=rows[index]||[],seen=new Map(),keys=headers.map((h,i)=>{const base=h||`Column ${i+1}`,count=seen.get(base)||0;seen.set(base,count+1);return count?`${base} #${count+1}`:base;}); return rows.slice(index+1).map(r=>Object.fromEntries(keys.map((k,i)=>[k,r[i]??'']))); }
export function matrixObjects(rows){const width=Math.max(...rows.map(r=>r.length),0);return rows.map(r=>Object.fromEntries(Array.from({length:width},(_,j)=>[`Column ${String.fromCharCode(65+j)}`,r[j]??''])));}
function matrix(text) { return parseCSV(text); }
async function readCSV(bucket, prefix, name) { if(!bucket?.list||!bucket?.get) throw new Error('R2 binding PROPERTY_DATA is not configured on this Pages deployment'); const normalizeName=(v)=>v.toLowerCase().replace(/[\u200e\u200f]/g,'').replace(/\s+/g,' ').trim(); const base=normalizeName(name).replace(/ \(1\)(?=\.csv$)/,''); const candidates=[name,name.replace('.csv',' (1).csv'),name.replace(' - ','  - ')].map(normalizeName); const listed=await bucket.list({prefix}); const object=listed.objects.find(o=>{const key=normalizeName(o.key);return candidates.some(wanted=>key.endsWith(wanted))||key.endsWith(base)}); if(!object) throw new Error(`Missing R2 file: ${prefix}${name}. Files must be inside the SPREADSHEETS/ prefix.`); const file=await bucket.get(object.key); if(!file) throw new Error(`Unable to read R2 object: ${object.key}`); return file.text(); }
export function buildData(raw) {
  const unified=raw.unified, easy=raw.easy, renters=raw.renters, purchases=raw.purchases, occupancy=raw.occupancy;
  const apartments=[]; const byId=new Map(), byUnifiedEasyId=new Map(), byUnit=new Map(), byEasy=new Map();
  unified.forEach(row=>{ const id=clean(Object.values(row)[0]); if(!id||byId.has(id))return; const a={id, unified:{}, easyRent:{}, renter:{}, bills:{water:[],arnona:[],gas:[]},transactions:[],rents:[],photos:[]}; for(const [k,v] of Object.entries(row))a.unified[k]=clean(v); a.unit=clean(row['EASYPROD - Appt ID']||row['NEW OCCUPANCY UNIT']||Object.values(row)[1]); a.occupancyUnit=clean(row['NEW OCCUPANCY UNIT']); a.yechida=clean(row['ZEHAVIT yechida']);a.address=clean(row['NEW OCCUPANCY ADRESSS']||row['zehavit address']);const fallback=a.address.match(/^(.*?)[\s]+(\d+)\s*\/\s*([^/]+)$/);if(fallback){a.buildingNumber=fallback[2];a.apartmentNumber=fallback[3].trim()} apartments.push(a); byId.set(id,a);if(a.unified['EASYPROD - UniquID'])byUnifiedEasyId.set(clean(a.unified['EASYPROD - UniquID']),a);if(a.unit)byUnit.set(key(a.unit),a);if(a.occupancyUnit)byUnit.set(key(a.occupancyUnit),a);if(a.yechida)byUnit.set(key(a.yechida),a); });
  easy.forEach(row=>{ const id=clean(row.UniquID||row['UniquID ']); const a=byUnifiedEasyId.get(id); if(!a)return; a.easyRent=Object.fromEntries(Object.entries(row).map(([k,v])=>[k,clean(v)])); a.buildingNumber=clean(row['Street Number']);a.apartmentNumber=clean(row.Appt);a.entrance=clean(row.Entrance);a.address=[row.Street,row['Street Number']].filter(Boolean).map(clean).join(' ');a.fullAddress=[a.address,row.Appt&&`Apt ${row.Appt}`,row.Entrance&&`Entrance ${row.Entrance}`].filter(Boolean).join(', '); a.altAddress=clean(row.AltAddress); byEasy.set(id,a); });
  // Some Unified records use an apartment-style address (street/number/unit) but
  // omit the building entrance. Reattach those records to the existing
  // entrance-specific building record so buildings, parcels, coordinates and
  // map markers remain consistent. This is intentionally limited to the known
  // affected addresses and never creates or edits source CSV records.
  const entranceFixes = new Set([
    'גוש עציון 93/54','השלום 131/1','השלום 133/1','השלום 133/19',
    'השלום 133/20','השלום 135/14','השלום 135/2','וינגייט 2/7',
    'חנה סנש 12/04','חנה סנש 14/06','חנה סנש 18/60',
    'רוטנברג 12/07','רוטנברג 12/27'
  ].map(key));
  const splitBase = value => {
    const match = clean(value).match(/^(.*?)\s+(\d+)\s*\/\s*([^/]+)$/);
    return match ? { street: clean(match[1]), number: clean(match[2]), apartment: clean(match[3]) } : null;
  };
  const baseKey = (street, number) => `${key(street)}|${key(number)}`;
  const knownBuildings = new Map();
  for (const a of apartments) {
    const street = clean(a.easyRent.Street || splitBase(a.unified['NEW OCCUPANCY ADRESSS'] || '')?.street);
    const number = clean(a.easyRent['Street Number'] || a.buildingNumber);
    if (!street || !number || !a.entrance) continue;
    const k = baseKey(street, number);
    const current = knownBuildings.get(k);
    // Prefer a candidate that already carries a parcel, since that is the
    // authoritative grouping used by the directory and map.
    if (!current || (!current.parcel && clean(a.easyRent.Parcel))) {
      knownBuildings.set(k, { street, number, entrance: a.entrance, parcel: clean(a.easyRent.Parcel) });
    }
  }
  for (const a of apartments) {
    const rawAddress = clean(a.unified['NEW OCCUPANCY ADRESSS'] || a.address);
    const parsed = splitBase(rawAddress);
    if (!parsed) continue;
    // Apply the explicit corrections above, plus the same safe rule to any
    // other record whose address contains a building/apartment slash but has
    // no entrance of its own.
    if (a.entrance && !entranceFixes.has(key(rawAddress))) continue;
    const building = knownBuildings.get(baseKey(parsed.street, parsed.number));
    if (!building) continue;
    a.address = `${parsed.street} ${parsed.number}`;
    a.buildingNumber = parsed.number;
    a.apartmentNumber = parsed.apartment;
    a.entrance = building.entrance;
    if (building.parcel) a.easyRent.Parcel = building.parcel;
    a.fullAddress = [a.address, `Apt ${a.apartmentNumber}`, `Entrance ${a.entrance}`].join(', ');
  }
  renters.forEach(row=>{const a=byUnit.get(key(row['יחידה']||row['ZEHAVIT yechida']));if(!a)return;const values=Object.values(row).map(clean);a.renter=Object.fromEntries(Object.entries(row).map(([k,v])=>[k,clean(v)]));a.bills.electricity=[];a.billDetails={electricity:{name:values[20],contract:values[21],meter:values[22],status:values[23]},water:{name:values[25],meter:values[26],property:values[27],status:values[28]},arnona:{name:values[30],status:values[31]},gas:{supplierType:values[33],name:values[34],consumer:values[35],meter:values[36]}};const months=Array.from({length:12},(_,i)=>String(i+1).padStart(2,'0')+'/15/2026');const blocks=[['electricity',57],['water',69],['arnona',81],['gas',93]];for(const [type,start] of blocks){for(let i=0;i<12;i++){const raw=values[start+i],normalized=clean(raw);if(!normalized||normalized.toLowerCase()==='חלק')continue;const n=Number(normalized.replace(/,/g,''));a.bills[type].push({month:months[i],value:Number.isFinite(n)?n:normalized,raw:normalized});}}});
  purchases.forEach(row=>{const purchaseId=clean(row.UNIT||row['Unit']||row['UNIT ']);const a=byUnifiedEasyId.get(purchaseId)||byEasy.get(purchaseId);if(a)a.transactions.push({...row,canonicalId:a.id,type:'Purchase'});});
  const occMatrix=Array.isArray(occupancy?.[0])?occupancy:null;
  if(occMatrix){const unitRow=occMatrix[7]||[],monthCol=0;for(let col=1;col<unitRow.length;col++){const a=byUnit.get(key(unitRow[col]));if(!a)continue;for(let row=110;row<occMatrix.length;row++){const d=date(occMatrix[row]?.[monthCol]);if(!d)continue;const raw=clean(occMatrix[row]?.[col]);if(!raw)continue;const numeric=/^[-+]?\d[\d,]*(?:\.\d+)?$/.test(raw),value=numeric?Number(raw.replace(/,/g,'')):0;a.rents.push({date:d,value,display:raw,status:numeric?'':raw.toUpperCase(),label:new Date(d)<new Date()?'Rent received':'Rent expected'});}}}
  else {const occRows=occupancy;const headers=Object.keys(occRows[0]||{}),unitRow=occRows[0]||{};headers.slice(1).forEach(h=>{const a=byUnit.get(key(unitRow[h]));if(!a)return;occRows.slice(2).forEach(r=>{const d=date(r[headers[0]]),raw=clean(r[h]);if(!d||!raw)return;const numeric=/^[-+]?\d[\d,]*(?:\.\d+)?$/.test(raw),value=numeric?Number(raw.replace(/,/g,'')):0;a.rents.push({date:d,value,display:raw,status:numeric?'':raw.toUpperCase(),label:new Date(d)<new Date()?'Rent received':'Rent expected'});});});}
  for(const a of apartments){const seen=new Set();a.rents=a.rents.filter(r=>{const k=`${a.id}|${r.date}`;if(seen.has(k))return false;seen.add(k);return true}).sort((x,y)=>y.date.localeCompare(x.date));}
  const coords=raw.coordinates||[],buildingRows=apartments.map(a=>{const renterValues=Object.values(a.renter),owner=clean(renterValues[1]||a.renter.Owner||a.easyRent['Owner 1']);const cls=clean(a.easyRent.Class),streetNumber=clean(a.buildingNumber),entrance=clean(a.entrance);const street=clean(a.easyRent.Street||a.address.split(/\s+\d+/)[0]);
    // Never fall back to a street-number-only match: the same number exists
    // on multiple Beer Sheva streets and that placed whole parcels elsewhere.
    const exactEntrance=coords.find(c=>clean(c.streetNumber)===streetNumber&&key(c.street)===key(street)&&entrance&&key(c.entrance)===key(entrance));
    const exactBuilding=coords.find(c=>clean(c.streetNumber)===streetNumber&&key(c.street)===key(street));
    const coord=exactEntrance||exactBuilding;
    return {Building:[a.address,entrance].filter(Boolean).join(' ')||a.unified['NEW OCCUPANCY ADRESSS']||'Address pending',Apartment:a.apartmentNumber||a.unit||a.unified['EASYPROD - Appt ID']||a.id,Entrance:entrance,Floor:clean(a.easyRent.Floor||renterValues[5]),Parcel:clean(a.easyRent.Parcel),Size:clean(a.easyRent.Size),Garden:clean(a.easyRent.Garden),Rooms:clean(renterValues[6]),InitialCost:clean(a.easyRent.Invested),Tenant:clean(renterValues[9]),TenantId:clean(renterValues[11]),TenantPhones:clean(renterValues[12]),TenantEmail:clean(renterValues[14]),TenantAddress:clean(renterValues[13]),GroupOwner:ownerGroup(owner),LeaseStart:clean(renterValues[16]),LeaseEnd:clean(renterValues[17]),LeaseStatus:clean(a.renter['סטאטוס חוזה']||a.renter['סטטוס חוזה']||a.renter.Status),Transactions:a.transactions,Rents:a.rents,Bills:a.bills,BillDetails:a.billDetails,lat:coord?.lat||'',lng:coord?.lng||'','Truly Unique ID':a.id,Yechida:a.yechida||'',Owner:owner,Class:cls,'Yechida status':a.yechida?'Has Yechida':'No Yechida'};}).sort((a,b)=>a.Building.localeCompare(b.Building)||(parseInt(a.Apartment)||9999)-(parseInt(b.Apartment)||9999));
  return {apartments,raw:{unified,easyRent:easy,renters,purchases,occupancy,buildings:buildingRows},meta:{apartmentCount:apartments.length,loadedAt:new Date().toISOString(),sources:{unified:{rows:unified.length,matched:apartments.length},easyRent:{rows:easy.length,matched:[...byEasy.values()].length},renters:{rows:renters.length,matched:apartments.filter(a=>Object.keys(a.renter).length).length},purchases:{rows:purchases.length,matched:apartments.reduce((n,a)=>n+a.transactions.length,0)},occupancy:{rows:occupancy.length,matched:apartments.reduce((n,a)=>n+a.rents.length,0)}},missingYechida:apartments.filter(a=>!a.yechida).length,withYechida:apartments.filter(a=>a.yechida).length}};
}
export async function onRequestGet({env,request}) { try { if(!cached) { const prefix='SPREADSHEETS/'; const texts=await Promise.all(CSV_NAMES.map(n=>readCSV(env.PROPERTY_DATA,prefix,n))); const parsed=texts.map(parseCSV); parsed[2]=parseCSVFromRow(texts[2],1); const occupancyMatrix=parseMatrix(texts[4]); cached=buildData({unified:parsed[0],easy:parsed[1],renters:parsed[2],purchases:parsed[3],occupancy:occupancyMatrix,coordinates:parsed[5]}); cached.raw.coordinates=parsed[5]; cached.raw.occupancy=matrixObjects(occupancyMatrix); } return Response.json(cached,{headers:{'cache-control':'private, max-age=300'}}); } catch(e) { return Response.json({error:e.message},{status:500}); } }






