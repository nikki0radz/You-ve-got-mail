import {readLook} from './parcel-round.mjs';
import {safeAppearance} from './appearance.mjs';
import {buttons,layouts} from './templates.mjs';
export const screen='postcard-composer', appVersion='0.1.42';
export const elements={
  background:['Popup background','#parcel-shop'],row:['Composer toolbar','.studio-tools'],note:['Add note','[data-tool=note]'],second:['Add sticker','[data-tool=second]'],
  ready:['Ready for post','[data-tool=ready]'],photo:['Upload photo','[data-tool=photo]'],back:['Designs','[data-tool=back]'],
  title:['Postcard title','h2'],hint:['Placement instructions','.studio-tip'],eyebrow:['Preview label','.studio-heading small'],
  art:['Postcard artwork','[data-layer=art]'],banner:['Note banner','[data-layer=note]'],extra:['Added sticker','[data-layer=second]'],
  remove:['Remove note','[data-tool=remove-note]'],editText:['Edit text','[data-tool=edit-note]'],
  paper:['Paper strip preview','[data-style="0"]'],ribbon:['Ribbon preview','[data-style="1"]'],airmail:['Airmail label preview','[data-style="2"]'],
  banners:['Banner choices row','.banner-options > div'],palette:['Colour and font row','.ink-row'],fontMenu:['Font menu','.note-font'],
  label:['Banner picker label','.banner-options small'],cropOk:['Confirm photo','[data-ok]'],cropZoom:['Photo zoom','.zoom-strip'],
  pocket:['Shared · toolbar buttons','.studio-tools button']
};
export const numbers={width:[1,900],height:[1,1200],padding:[0,90],margin:[0,100],fontSize:[8,96],radius:[0,100],borderWidth:[0,20],opacity:[0,100],gap:[0,64],x:[0,95],y:[0,95],moveX:[-1000,1000],moveY:[-1000,1000]};
export const colours=['color','background','borderColor'];
export const choices={align:['left','center','right'],font:['PostalBaloo','system-ui','Georgia','monospace','ParcelCaption'],order:['note-first','sticker-first'],equal:['equal','content']};
export const stickerIds=[125,126,163,151,159,162];
export const empty=()=>({styles:{},copies:[]});
export function cleanLayout(data){
  const out=empty();
  for(const [key,max] of Object.entries({header:3,timing:2,receipt:2,calendar:2})){
    const n=data?.variants?.[key];if(Number.isInteger(n)&&n>=0&&n<=max)(out.variants??={})[key]=n;
  }
  for(const cp of Array.isArray(data?.copies)?data.copies.slice(0,16):[]){
    if(!/^copy-[a-f0-9-]{36}$/.test(cp?.id)||!stickerIds.includes(cp.asset)||out.copies.some(c=>c.id===cp.id))continue;
    out.copies.push({id:cp.id,asset:cp.asset});
  }
  for(const k of [...Object.keys(elements),...Object.keys(data?.styles||{}).filter(k=>/^view-[a-z0-9]+$/.test(k)),...out.copies.map(c=>c.id)]){
    const styles={},raw=data?.styles?.[k];if(!raw||typeof raw!=='object')continue;
    for(const [key,[min,max]] of Object.entries(numbers))if(Number.isFinite(raw[key]))styles[key]=Math.max(min,Math.min(max,Math.round(raw[key]*10)/10));
    for(const key of colours)if(/^#[0-9a-f]{6}$/i.test(raw[key]))styles[key]=raw[key];
    for(const [key,values] of Object.entries(choices))if(values.includes(raw[key]))styles[key]=raw[key];
    if(readLook(raw.reviewLook))styles.reviewLook=raw.reviewLook;
    if(raw.decor)styles.decor=safeAppearance(raw.decor);
    if(Object.hasOwn(buttons,raw.skin))styles.skin=raw.skin;
    if(Object.hasOwn(layouts,raw.arrangement))styles.arrangement=raw.arrangement;
    if(Object.keys(styles).length)out.styles[k]=styles;
  }
  return out;
}
export function newBook(){return {schema:1,screen,active:null,drafts:[]}}
export function current(book){return book.drafts.find(d=>d.id===book.active)}
export function record(book,name,layout,newDraft=false){
  let d=current(book);
  if(!d||newDraft){d={id:crypto.randomUUID(),name,approved:null,revisions:[]};book.drafts.push(d);book.active=d.id;}
  d.name=name;d.revisions.push({id:crypto.randomUUID(),createdAt:new Date().toISOString(),screen:book.screen,appVersion,layout:cleanLayout(layout)});
  return d.revisions.at(-1);
}

