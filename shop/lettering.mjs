export const fonts={
  Handwritten:['ParcelCaption, cursive',400],
  Rounded:['PostalBaloo, sans-serif',650],
  Classic:['Georgia, serif',600],
  Typewriter:['monospace',500]
};
export function fontSpec(key,size){
  const [family,weight]=fonts[key]||fonts.Handwritten;return weight+' '+size+'px '+family;
}
export function writingBox(item){
  const [l,t,r,b]=item.textBox;if(item.category!=='Notes')return [l,t,r,b];
  return [Math.max(.03,l-.027),Math.max(.03,t-.018),Math.min(.97,r+.027),Math.min(.97,b+.018)];
}
