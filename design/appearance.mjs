// Copy appearance, leaving the destination button's action, label and position intact.
const properties=['backgroundColor','borderTopColor','borderTopWidth','borderTopStyle','borderRadius','boxShadow','color','fontFamily','fontSize','fontWeight','letterSpacing','lineHeight','paddingTop','paddingRight','paddingBottom','paddingLeft','textDecorationLine','textAlign'];
export function safeAppearance(raw){
  const out={};
  for(const k of properties){
    const v=raw?.[k];if(typeof v==='string'&&v.length<200&&/^[\w\s.,%#()'"-]+$/.test(v)&&!/(url|var|attr|image|expression)\s*\(/i.test(v))out[k]=v;
  }
  return out;
}
export function appearance(el){
  if(!el)return null;
  const c=getComputedStyle(el),decor=safeAppearance(Object.fromEntries(properties.map(k=>[k,c[k]])));
  const hex=s=>{const parts=s.match(/[\d.]+/g);return parts&&parts.length===3?'#'+parts.map(v=>(+v).toString(16).padStart(2,'0')).join(''):null};
  const out={decor,height:Math.round(el.getBoundingClientRect().height),fontSize:parseFloat(c.fontSize),radius:parseFloat(c.borderTopLeftRadius)||0,borderWidth:parseFloat(c.borderTopWidth)||0};
  for(const [k,v] of [['color',c.color],['background',c.backgroundColor],['borderColor',c.borderTopColor]])if(hex(v))out[k]=hex(v);
  const family=c.fontFamily.split(',')[0].replace(/["']/g,'');if(['Georgia','system-ui','PostalBaloo','ParcelCaption','monospace'].includes(family))out.font=family;
  return out;
}
export function appearanceCSS(decor){
  const css=safeAppearance(decor);
  if(css.borderTopWidth)css.borderWidth=css.borderTopWidth;
  if(css.borderTopColor)css.borderColor=css.borderTopColor;
  if(css.borderTopStyle)css.borderStyle=css.borderTopStyle;
  return css;
}
