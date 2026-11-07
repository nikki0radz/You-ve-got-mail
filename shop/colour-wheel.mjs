const inks=[
  ['Black','#000000'],['White','#ffffff'],['Cream','#fff9ed'],['Peach','#f2d5bf'],
  ['Lilac','#dbc6d4'],['Plum','#634961'],['Sage','#c9ddd1'],['Lagoon','#a1c6bc'],
  ['Leaf','#597c66'],['Forest','#283f32']
];
export function colourButton(label,accessible,initial,apply){
  const button=document.createElement('button');
  button.type='button';button.className='colour-chip';
  button.setAttribute('aria-label',accessible);button.setAttribute('aria-haspopup','dialog');
  const sample=document.createElement('i');sample.setAttribute('aria-hidden','true');
  sample.style.backgroundColor=initial;button.append(label,sample);
  button.onclick=()=>{
    const dialog=document.createElement('dialog');dialog.className='ink-picker swatch-picker';
    dialog.setAttribute('aria-label',accessible);
    const title=document.createElement('h2');title.textContent=accessible;
    const list=document.createElement('div');list.className='ink-swatches';
    const options=accessible==='Optional note box colour'||label==='Banner'?[...inks,['Transparent','transparent']]:inks;
    for(const [name,value] of options){
      const swatch=document.createElement('button');swatch.type='button';swatch.title=name;
      swatch.setAttribute('aria-label',name);swatch.setAttribute('aria-pressed',String(initial.toLowerCase()===value));
      swatch.style.setProperty('--swatch',value);
      if(value==='transparent')swatch.className='clear-swatch';
      swatch.onclick=()=>{initial=value;sample.style.backgroundColor=value;apply(value);dialog.close();};
      list.append(swatch);
    }
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
    dialog.append(title,list,cancel);dialog.onclose=()=>{dialog.remove();button.focus();};
    document.body.append(dialog);dialog.showModal();
    (list.querySelector('[aria-pressed=true]')||list.firstElementChild).focus();
  };
  return button;
}
