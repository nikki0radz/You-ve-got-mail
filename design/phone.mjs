const cacheKey='pigeon.design.workroom.cache.v1';
export function phoneProfile(){
  try{return JSON.parse(localStorage.getItem(cacheKey))?.profile||null}catch{return null}
}
export function phoneSize(profile){
  const measured=Number.isFinite(profile?.width)&&profile.width>=150&&profile.width<=1600&&Number.isFinite(profile?.height)&&profile.height>=200&&profile.height<=2400;
  return measured?{...profile,measured}:{width:390,height:780,insets:{top:24,bottom:24},measured:false};
}
export const frameURL=screen=>screen==='postcard-composer'?'composer.html?v=rounds1':'page.html?preview=1&page='+encodeURIComponent(screen)+'&theme='+(new URLSearchParams(location.search).get('theme')==='dark'?'dark':'light');
