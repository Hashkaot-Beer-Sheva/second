import React from 'react';
export default function ApartmentFinancialHighlights({ apartment, parseDate, leaseSummary }) {
  if (!apartment?.Yechida && !apartment?.yechida) return null;
  const ownerText=String(apartment.GroupOwner||apartment.Owner||'');
  const ownedByMorris=/Morris|מוריס|קרן אבירם|רוקון נאמנים/i.test(ownerText);
  const ownedByWeiss=/Weiss|וייס|השקעות דרום/i.test(ownerText);
  if (!ownedByMorris && !ownedByWeiss) return null;
  const rents=(apartment.Rents||apartment.rents||[]).filter(r=>Number(r.value)>0).sort((a,b)=>parseDate(b.date)-parseDate(a.date));
  const monthly=Number(rents[0]?.value)||0, annual=monthly*12;
  const bills=Object.entries(apartment.Bills||apartment.bills||{}).flatMap(([type,list])=>(Array.isArray(list)?list:[]).map(x=>({type,value:Number(x.value)||0})));
  const expenses=bills.reduce((sum,item)=>sum+item.value,0), cost=Number(String(apartment.InitialCost||apartment.easyRent?.Invested||'').replace(/[^0-9.]/g,''))||0, yieldRate=cost?(annual-expenses)/cost*100:0, lease=leaseSummary(apartment);
  const leaseText=lease.expired?`Expired ${lease.days} days ago`:lease.vacant?'Vacant':lease.soon?`Expires in ${lease.days} days`:lease.days!=null?`${lease.days} days remaining`:'Lease status unavailable';
  const breakdown={electricity:0,water:0,arnona:0,gas:0}; bills.forEach(item=>{if(item.type in breakdown)breakdown[item.type]+=item.value});
  const net=annual-expenses; return <section className="apartment-financials"><div className="apartment-financial-head"><span className="pill">FINANCIAL SNAPSHOT</span><strong>{leaseText}</strong></div><div className="apartment-financial-grid"><span><small>Latest monthly rent</small><b>{monthly?monthly.toLocaleString():'—'}</b></span><span><small>Annualized rent</small><b>{annual?annual.toLocaleString():'—'}</b></span><span><small>Upfront cost</small><b>{cost?cost.toLocaleString():'—'}</b></span><span><small>Recorded expenses</small><b>{expenses?expenses.toLocaleString():'—'}</b></span><span><small>Net annual income</small><b>{net?net.toLocaleString():'—'}</b></span><span><small>Net yield</small><b>{cost?`${yieldRate.toFixed(1)}%`:'—'}</b></span></div>{cost>0&&<div className="apartment-financial-breakdown apartment-financial-metrics"><span>Expense ratio<b>{annual?`${(expenses/annual*100).toFixed(1)}%`:'—'}</b></span><span>Simple payback<b>{net>0?`${(cost/net).toFixed(1)} yrs`:'—'}</b></span></div>}{bills.length>0&&<div className="apartment-financial-breakdown"><small>Expense breakdown</small>{Object.entries(breakdown).filter(([,value])=>value>0).map(([type,value])=><span key={type}>{type}<b>{value.toLocaleString()}</b></span>)}</div>}</section>
}