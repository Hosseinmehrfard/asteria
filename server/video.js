/** Normalize supported video sources without trusting arbitrary iframe HTML. */
export function normalizeVideo(input){
  if(typeof input!=='string'||input.length>1200)return null;
  if(/^\/uploads\/[a-f0-9]{40}\.(mp4|webm)$/i.test(input.trim()))return {provider:'file',source_url:input.trim(),embed_url:input.trim()};
  let url;
  try{url=new URL(input.trim());}catch{return null;}
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,'');
  let id='';
  if(['youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','youtu.be'].includes(host)){
    const parts=url.pathname.split('/').filter(Boolean);
    if(host==='youtu.be')id=parts[0]||'';
    else if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
    else if(['embed','shorts','live','v'].includes(parts[0]))id=parts[1]||'';
    if(!/^[\w-]{11}$/.test(id))return null;
    return {provider:'youtube',source_url:`https://www.youtube.com/watch?v=${id}`,embed_url:`https://www.youtube-nocookie.com/embed/${id}?rel=0`};
  }
  if(['aparat.com','m.aparat.com'].includes(host)){
    const parts=url.pathname.split('/').filter(Boolean);
    if(parts[0]==='v')id=parts[1]||'';
    else if(parts[0]==='video'&&parts[1]==='video'&&parts[2]==='embed'){
      id=parts[3]==='videohash'?parts[4]||'':parts[4]==='videohash'?parts[5]||'':parts[3]||'';
    } else if(parts[0]==='embed')id=parts[1]||'';
    if(!/^[A-Za-z0-9_-]{4,32}$/.test(id))return null;
    return {provider:'aparat',source_url:`https://www.aparat.com/v/${id}`,embed_url:`https://www.aparat.com/video/video/embed/videohash/${id}/vt/frame`};
  }
  // Only allow actual files served by this application, never arbitrary external MP4 URLs.
  if(!url.search&&!url.hash&&url.pathname.startsWith('/uploads/')&&/\.(mp4|webm)$/i.test(url.pathname)){
    return {provider:'file',source_url:url.pathname,embed_url:url.pathname};
  }
  return null;
}
export const mediaIsVideo=(mime='')=>mime==='video/mp4'||mime==='video/webm';
