const inks=[
  ['Black','#000000'],['White','#ffffff'],['Cream','#fff9ed'],['Peach','#f2d5bf'],
  ['Lilac','#dbc6d4'],['Plum','#634961'],['Sage','#c9ddd1'],['Lagoon','#a1c6bc'],
  ['Leaf','#597c66'],['Forest','#365a40'],['Butter','#ffe07d'],['Ochre','#b77c31'],
  ['Coral','#ed8a78'],['Rose','#d77d9c'],['Cherry','#a93e50'],['Berry','#803361'],
  ['Lavender','#b7a6da'],['Sky','#9ac8e0'],['Blue','#507ca4'],['Midnight','#273a50']
];
export function colourButton(label,accessible,initial,apply){
  const button=document.createElement('button');
  button.type='button';button.className='colour-chip';
  button.setAttribute('aria-label',accessible);button.setAttribute('aria-haspopup','dialog');
  const sample=document.createElement('i');sample.setAttribute('aria-hidden','true');
  function updateSample(value){sample.style.backgroundColor=value;sample.classList.toggle('clear-swatch',value==='transparent');}
  updateSample(initial);button.append(label,sample);
  button.onclick=()=>{
    const dialog=document.createElement('dialog');dialog.className='ink-picker swatch-picker';
    dialog.setAttribute('aria-label',accessible);
    const title=document.createElement('h2');title.textContent=accessible;
    const list=document.createElement('div');list.className='ink-swatches';
    const options=[...inks];
    if(accessible==='Optional note box colour'||label==='Banner')options.push(['Transparent','transparent']);
    if(initial&&!options.some(([,value])=>value===initial.toLowerCase()))options.push(['Current colour',initial]);
    for(const [name,value] of options){
      const swatch=document.createElement('button');swatch.type='button';swatch.title=name;
      swatch.setAttribute('aria-label',name);swatch.setAttribute('aria-pressed',String(initial?.toLowerCase()===value));
      swatch.style.setProperty('--swatch',value);
      if(value==='transparent')swatch.className='clear-swatch';
      swatch.onclick=()=>{initial=value;updateSample(value);apply(value);dialog.close();};
      list.append(swatch);
    }
    const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.onclick=()=>dialog.close();
    dialog.append(title,list,cancel);dialog.onclose=()=>{dialog.remove();button.focus();};
    document.body.append(dialog);dialog.showModal();
    (list.querySelector('[aria-pressed=true]')||list.firstElementChild).focus();
  };
  return button;
}
