export function stylePicker(key,label,names){
  let selected=0;
  try{selected=Number(localStorage.getItem('pigeon-style-'+key))||0;}catch{}
  return '<label class="style-choice"><span>'+label+'</span><select data-style-key="'+key+'">'+names.map((name,i)=>'<option value="'+i+'" '+(i===selected?'selected':'')+'>'+name+'</option>').join('')+'</select></label>';
}
export function wireStyle(root,key,change){
  const select=root.querySelector('[data-style-key="'+key+'"]');
  select.onchange=()=>{try{localStorage.setItem('pigeon-style-'+key,select.value);}catch{}change(Number(select.value));};
  change(Number(select.value));
}
