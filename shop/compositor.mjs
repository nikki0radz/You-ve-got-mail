import {reminderRepair} from './reminder-label.mjs';
import {fontSpec,isNotePaper,writingBox} from './lettering.mjs';
const sheets = new Map();
const importedImages = new Map();

export function loadSheet(url) {
  // Bound decoded originals, including remote uploads, rather than retaining
  // every full-size picture visited during a session.
  const cache=url.startsWith('blob:')||url.startsWith('data:')?importedImages:sheets;
  if(cache.has(url)){const current=cache.get(url);cache.delete(url);cache.set(url,current);return current;}
  if (!cache.has(url)) {
    if(cache.size>=(cache===importedImages?2:4))cache.delete(cache.keys().next().value);
    const promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding='async';
      image.onload = () => resolve(image);
      image.onerror = () => { if(cache.get(url)===promise)cache.delete(url); reject(new Error('Could not load the artwork. Please try again.')); };
      if(/^https?:/i.test(url))image.crossOrigin='anonymous';
      image.src = url;
    });
    cache.set(url, promise);
  }
  return cache.get(url);
}

export function writeText(context, value, rect, colour, font, centerInk=false) {
  if (!value.trim()) return;
  const [x, y, width, height] = rect;
  let lines;
  for (let size = Math.min(180,Math.floor(height * .88)); size >= 4; size--) {
    context.font = fontSpec(font,size);
    lines = [];
    for (const paragraph of value.split('\n')) {
      let line = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        if (line && context.measureText(line + ' ' + word).width > width) { lines.push(line); line = ''; }
        for (const character of word) {
          if (context.measureText(line + character).width > width) { lines.push(line); line = ''; }
          line += character;
        }
        line += ' ';
      }
      lines.push(line.trimEnd());
    }
    if (lines.length * size * 1.13 > height) continue;
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = colour;
    const advance=size*1.13;
    let baseline=y+height/2-(lines.length-1)*advance/2;
    if(centerInk){
      context.textBaseline='alphabetic';
      let top=Infinity,bottom=-Infinity;
      lines.forEach((line,i)=>{if(line.trim()){const m=context.measureText(line.trimEnd());top=Math.min(top,i*advance-m.actualBoundingBoxAscent);bottom=Math.max(bottom,i*advance+m.actualBoundingBoxDescent);}});
      if(Number.isFinite(top+bottom))baseline=y+(height-top-bottom)/2;
    }
    lines.forEach((line,i)=>context.fillText(line.trimEnd(),x+width/2,baseline+i*advance));
    return;
  }
}

export async function composePNG(item, draft, density = 1) {
  if(draft.words)await document.fonts.load(fontSpec(draft.font,20));
  if(draft.extra)await document.fonts.load(fontSpec(draft.extraFont,20));
  const [sheet, mask] = await Promise.all([loadSheet(item.master || item.sheet), item.maskSheet && loadSheet(item.maskSheet)]);
  const canvas = document.createElement('canvas');
  canvas.width = 640 * density; canvas.height = (draft.extra.trim() ? 768 : 640) * density;
  const ctx = canvas.getContext('2d');
  ctx.scale(density, density);
  ctx.imageSmoothingQuality = 'high';
  ctx.beginPath();
  if (draft.shape === 'Oval') ctx.ellipse(320,320,311,311,0,0,2*Math.PI);
  else ctx.roundRect(9,9,622,622,draft.shape === 'Square' ? 0 : 38);
  if (draft.background) { ctx.fillStyle = draft.background; ctx.fill(); }
  if (draft.border) { ctx.strokeStyle = draft.border; ctx.lineWidth = 5; ctx.stroke(); }
  const [, , sw, sh] = item.rect;
  const scale = Math.min(574 / sw, 574 / sh);
  const width = sw * scale, height = sh * scale, x = (640-width)/2, y = (640-height)/2;
  let overlay;
  if (draft.photo && mask) {
    const [l,t,r,b] = item.opening;
    const pw = (r-l)*width, ph = (b-t)*height;
    const fit = Math.max(pw / draft.photo.width, ph / draft.photo.height) * draft.zoom;
    const photo = document.createElement('canvas'); photo.width = photo.height = 640 * density;
    const layer = photo.getContext('2d');
    layer.scale(density, density);
    layer.imageSmoothingQuality = 'high';
    layer.drawImage(draft.photo, x+l*width+(pw-draft.photo.width*fit)*draft.panX, y+t*height+(ph-draft.photo.height*fit)*draft.panY, draft.photo.width*fit, draft.photo.height*fit);
    layer.globalCompositeOperation='destination-in';
    if(item.sharedId)layer.drawImage(mask,x,y,width,height);
    else layer.drawImage(mask,...item.rect,x,y,width,height);
    if(item.photoOnTop)overlay=photo;else ctx.drawImage(photo,0,0,640,640);
  }
  ctx.save();
  if (item.artClip && !item.master) {
    const clip = new Path2D();
    clip.addPath(new Path2D(item.artClip), new DOMMatrix().translate(x,y).scale(width/sw,height/sh));
    ctx.clip(clip,'evenodd');
  }
  let source=sheet;
  let region=item.master?[]:item.rect;
  if(isNotePaper(item)&&draft.paper){
    const tinted=document.createElement('canvas');tinted.width=Math.ceil(width*density);tinted.height=Math.ceil(height*density);
    const ink=tinted.getContext('2d');ink.drawImage(sheet,...region,0,0,tinted.width,tinted.height);
    ink.globalCompositeOperation='source-atop';ink.globalAlpha=.48;ink.fillStyle=draft.paper;ink.fillRect(0,0,tinted.width,tinted.height);
    source=tinted;region=[];
  }
  ctx.drawImage(source,...region,x,y,width,height);
  ctx.restore();
  if(overlay)ctx.drawImage(overlay,0,0,640,640);
  const originalLabel=item.labelPatch&&draft.words===(item.originalName||item.name)&&!draft.font&&!draft.ink;
  if(item.labelPatch&&!originalLabel)ctx.drawImage(reminderRepair(item,sheet),x,y,width,height);
  if (item.textBox&&!originalLabel) {
    const [l,t,r,b]=writingBox(item);
    const boxWidth=(r-l)*width, boxHeight=(b-t)*height;
    ctx.save();
    ctx.translate(x+(l+r)*width/2,y+(t+b)*height/2);
    ctx.rotate((item.textRotation||0)*Math.PI/180);
    writeText(ctx,draft.words,[-boxWidth/2,-boxHeight/2,boxWidth,boxHeight],draft.ink||item.ink,draft.font,true);
    ctx.restore();
  }
  if (draft.extra.trim()) {
    ctx.fillStyle=draft.noteFill||'#fff4da'; ctx.beginPath(); ctx.roundRect(10,643,620,116,18); ctx.fill();
    writeText(ctx,draft.extra,[26,652,588,96],draft.noteInk||'#273d31',draft.extraFont);
  }
  return canvas;
}
