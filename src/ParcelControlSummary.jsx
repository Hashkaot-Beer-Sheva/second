import React from 'react';
import {parcelControlData} from './parcelControlData.js';

export default function ParcelControlSummary({parcel,apartments=[]}){
  const reference=parcelControlData.find(x=>String(x.parcel)===String(parcel));
  const group=a=>/Amidar/i.test(a.Class||'')?'Amidar':(a.GroupOwner||(/וייס|Weiss|השקעות דרום/i.test(a.Owner||'')?'Weiss':/מוריס|Morris|קרן אבירם|רוקון נאמנים/i.test(a.Owner||'')?'Morris':'Other'));
  const signed=Number(reference?.signed||0);
  const rawOther=apartments.filter(a=>group(a)==='Other').length;
  const counts={Weiss:apartments.filter(a=>group(a)==='Weiss').length,Morris:apartments.filter(a=>group(a)==='Morris').length,Amidar:apartments.filter(a=>group(a)==='Amidar').length,Other:Math.max(0,rawOther-signed)};
  const total=apartments.length, percent=reference?.controlledPercent??0, controlledCount=Math.round(total*percent/100), won=percent>67;
  const pct=n=>total?Math.round(n/total*100):0;
  return <section className="map-parcel-control"><div className="map-parcel-control-head"><h4>Control Board</h4><span>{signed} signatures</span></div><div className="map-parcel-control-result"><div><small>Control result</small><b>{controlledCount} of {total} apartments</b><span>{percent}% controlled</span></div><strong className={won?'won':'not-won'}>{won?'WON':'NOT WON'}</strong></div><div className="map-parcel-counts"><span><b>{total}</b>Total apartments</span><span className="weiss"><b>{counts.Weiss}</b>Weiss</span><span className="morris"><b>{counts.Morris}</b>Morris</span><span className="amidar"><b>{counts.Amidar}</b>Amidar</span><span className="other"><b>{counts.Other}</b>Other</span><span className="signed"><b>{signed}</b>Signed</span></div><div className="map-parcel-bar"><i className="bar-weiss" style={{width:pct(counts.Weiss)+'%'}}/><i className="bar-morris" style={{width:pct(counts.Morris)+'%'}}/><i className="bar-amidar" style={{width:pct(counts.Amidar)+'%'}}/><i className="bar-other" style={{width:pct(counts.Other)+'%'}}/><i className="bar-signed" style={{width:pct(signed)+'%'}}/></div><div className="map-parcel-legend"><span>W {pct(counts.Weiss)}%</span><span>M {pct(counts.Morris)}%</span><span>A {pct(counts.Amidar)}%</span><span>O {pct(counts.Other)}%</span><span>S {pct(signed)}%</span></div></section>;
}
