import React,{useEffect,useRef} from 'react';

export default function BuildingLeafletMap({point,resetKey=0}){
  const ref=useRef(null);
  useEffect(()=>{
    let map;
    const load=()=>{
      if(!ref.current||!window.L||!point)return;
      const lat=Number(point.lat),lng=Number(point.lng);
      if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
      map=window.L.map(ref.current,{zoomControl:true}).setView([lat,lng],18);
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap contributors'}).addTo(map);
      const icon=window.L.divIcon({className:'building-modal-pin',html:'<span>⌂</span>',iconSize:[30,30],iconAnchor:[15,29]});
      window.L.marker([lat,lng],{icon}).addTo(map).bindTooltip(point.address||'Building',{direction:'top'});
      requestAnimationFrame(()=>{map?.invalidateSize();setTimeout(()=>map?.invalidateSize(),120);setTimeout(()=>map?.invalidateSize(),500)});
    };
    if(window.L)load();else{
      if(!document.querySelector('link[data-leaflet]')){const css=document.createElement('link');css.rel='stylesheet';css.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';css.dataset.leaflet='1';document.head.appendChild(css)}
      const existing=document.querySelector('script[data-leaflet]');
      if(existing){existing.addEventListener('load',load,{once:true})}
      else{const js=document.createElement('script');js.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';js.dataset.leaflet='1';js.onload=load;document.body.appendChild(js)}
    }
    return()=>{map?.remove()};
  },[point,resetKey]);
  return <div ref={ref} className="building-leaflet-map"/>;
}
