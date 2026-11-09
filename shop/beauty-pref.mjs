const key='pigeon.camera.beauty';
let transient;
export function beautyEnabled(storage){if(transient!==undefined)return transient;try{return (storage??globalThis.localStorage)?.getItem(key)!=='off';}catch{return true;}}
export function setBeautyEnabled(on,storage){transient=Boolean(on);try{const target=storage??globalThis.localStorage;if(target){target.setItem(key,on?'on':'off');transient=undefined;}}catch{}}
