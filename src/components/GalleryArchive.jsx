import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,Maximize2,X} from 'lucide-react';
import {driveImageUrl,fullPhotoArchive} from '../data/driveGallery';

const categoryOf=({title})=>{
  if(/^ZAFE-CAROUSEL/i.test(title))return 'CAROUSEL';
  if(/^(ZAFE |Z\d|C\d)/i.test(title))return 'CAMPAIGN';
  if(/^Copy of GRADE/i.test(title))return 'EXTENDED';
  return 'PROCESS';
};

export default function GalleryArchive(){
  const [assets,setAssets]=useState(fullPhotoArchive);
  const [slide,setSlide]=useState(0);
  const [filter,setFilter]=useState('ALL');
  const [visible,setVisible]=useState(36);
  const [open,setOpen]=useState(null);
  const orderedCarousel=useMemo(()=>assets.filter(({title})=>/^(ZAFE-CAROUSEL|ZAFE |Z\d|C\d)/i.test(title)).sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true})),[assets]);
  const filtered=useMemo(()=>assets.filter(item=>filter==='ALL'||categoryOf(item)===filter),[filter,assets]);
  useEffect(()=>{fetch('/.netlify/functions/drive-gallery').then(response=>response.ok?response.json():null).then(data=>{if(data?.files?.length)setAssets(data.files)}).catch(()=>{})},[]);
  useEffect(()=>{const timer=setInterval(()=>setSlide(value=>(value+1)%orderedCarousel.length),5500);return()=>clearInterval(timer)},[orderedCarousel.length]);
  useEffect(()=>setVisible(36),[filter]);
  const move=(direction)=>setSlide(value=>(value+direction+orderedCarousel.length)%orderedCarousel.length);
  return <>
    <section className="visual-archive" id="gallery">
      <header className="visual-archive-head"><div><p>05 / COMPLETE VISUAL DOCUMENTATION</p><h2>The process,<br/><em>in full.</em></h2></div><div className="gallery-tally"><strong>{assets.length}</strong><span>DRIVE IMAGES INDEXED</span><small>Photography · campaign studies · carousel designs</small></div></header>

      <div className="story-carousel" aria-label="ZAFE carousel archive">
        <div className="story-copy"><span>CURATED STORY SEQUENCE</span><h3>Campaign<br/>carousels</h3><p>Designed frames documenting the ideas, language and visual development around ZAFE.</p><div className="story-controls"><button onClick={()=>move(-1)} aria-label="Previous slide"><ArrowLeft/></button><b>{String(slide+1).padStart(2,'0')} / {String(orderedCarousel.length).padStart(2,'0')}</b><button onClick={()=>move(1)} aria-label="Next slide"><ArrowRight/></button></div></div>
        <button className="story-stage" onClick={()=>setOpen(orderedCarousel[slide])} aria-label={`Open ${orderedCarousel[slide]?.title}`}><img src={driveImageUrl(orderedCarousel[slide]?.id,1800)} alt={orderedCarousel[slide]?.title}/><span>{orderedCarousel[slide]?.title}</span></button>
        <div className="story-rail">{orderedCarousel.map((item,index)=><button className={index===slide?'active':''} key={item.id} onClick={()=>setSlide(index)} aria-label={`Show ${item.title}`}><img loading="lazy" src={driveImageUrl(item.id,400)} alt=""/><span>{String(index+1).padStart(2,'0')}</span></button>)}</div>
      </div>

      <div className="gallery-index-head"><div><span>THE COMPLETE IMAGE INDEX</span><p>Every image currently supplied in the ZAFE Drive is available here.</p></div><div className="gallery-filters">{['ALL','PROCESS','CAROUSEL','CAMPAIGN','EXTENDED'].map(type=><button className={filter===type?'active':''} onClick={()=>setFilter(type)} key={type}>{type}<small>{type==='ALL'?assets.length:assets.filter(item=>categoryOf(item)===type).length}</small></button>)}</div></div>
      <div className="archive-masonry">{filtered.slice(0,visible).map((item,index)=><button className={`archive-photo photo-${index%7}`} key={item.id} onClick={()=>setOpen(item)}><img loading="lazy" src={driveImageUrl(item.id,900)} alt={`ZAFE archive: ${item.title}`}/><span><b>{String(index+1).padStart(3,'0')}</b>{item.title.replace('Copy of ','')}<Maximize2 size={13}/></span></button>)}</div>
      {visible<filtered.length&&<button className="load-archive" onClick={()=>setVisible(count=>Math.min(count+36,filtered.length))}>LOAD 36 MORE <span>{visible} / {filtered.length}</span></button>}
    </section>
    {open&&<div className="gallery-lightbox" role="dialog" aria-modal="true" aria-label={open.title}><button className="lightbox-close" onClick={()=>setOpen(null)}><X/> CLOSE</button><img src={driveImageUrl(open.id,2400)} alt={open.title}/><footer><span>{categoryOf(open)}</span><strong>{open.title}</strong><a href={`https://drive.google.com/file/d/${open.id}/view`} target="_blank" rel="noreferrer">ORIGINAL ON DRIVE ↗</a></footer></div>}
  </>;
}
