// Existing Android versions display incoming parcels as PNGs. Send the text as
// structured content too, and render a readable copy for their pop-up screen.
export function wrapReplyText(text,measure,maxWidth){
 const parts=typeof Intl.Segmenter==='function'?new Intl.Segmenter(undefined,{granularity:'grapheme'}):null;
 const result=[];
 for(const paragraph of text.replace(/\n{3,}/g,'\n\n').split('\n')){
  if(!paragraph){result.push('');continue;}
  let line='';const chars=parts?[...parts.segment(paragraph)].map(p=>p.segment):Array.from(paragraph);
  for(const char of chars){if(line&&measure(line+char)>maxWidth){const space=line.lastIndexOf(' ');if(space>line.length/2){result.push(line.slice(0,space));line=line.slice(space+1)+char;}else{result.push(line);line=char;}}else line+=char;}
  result.push(line);
 }
 return result;
}
export async function textReplyImage(text){
 await document.fonts.load('36px Nunito');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');let size=36,lines;
 do{ctx.font='700 '+size+'px Nunito,system-ui';lines=wrapReplyText(text,s=>ctx.measureText(s).width,600);if(lines.length*size*1.4<=3000)break;size--;}while(size>6);
 canvas.width=720;canvas.height=Math.max(280,Math.ceil(lines.length*size*1.4+160));
 ctx.fillStyle='#faf4e5';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#294938';ctx.font='700 20px Nunito,system-ui';ctx.fillText('PIGEON POST · REPLY',60,60);
 ctx.font='700 '+size+'px Nunito,system-ui';ctx.textBaseline='top';lines.forEach((line,i)=>ctx.fillText(line,60,110+i*size*1.4));
 return canvas.toDataURL('image/png');
}
