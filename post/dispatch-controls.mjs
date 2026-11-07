import {stylePicker,wireStyle} from './style-choices.mjs';

const pad=n=>String(n).padStart(2,'0');
const dayValue=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');
export function dispatchControls(host,draft){
  host.innerHTML=
    '<fieldset class="timing-options" data-base-look="whenticks-1" data-review-look="whenticks-1"><legend data-review-look="timeheading-1" data-base-look="timeheading-1">When should it arrive?</legend><div>'+[['now','Now'],['later','Later']].map(([key,label])=>'<label><input type="radio" name="post-time" value="'+key+'"><span><b>'+label+'</b></span></label>').join('')+'</div></fieldset>'+
    '<section class="schedule-panel" hidden>'+stylePicker('calendar','Date style',['Postmarked calendar','Diary slip','Quick booking'])+'<div class="date-content"></div><small>Times are local to you · up to 30 days ahead</small></section>';
  const panel=host.querySelector('.schedule-panel'),content=host.querySelector('.date-content');
  let month;const today=new Date(),last=new Date(today.getTime()+30*86400000);
  function setDate(val){draft.day=val;month=new Date(val+'T12:00');}
  function draw(style){
    const chosen=draft.day||dayValue(today);month=month||new Date(chosen+'T12:00');
    const dateField='<label>Date<input type="date" data-day min="'+dayValue(today)+'" max="'+dayValue(last)+'" value="'+(draft.day||'')+'"></label>';
    let body=dateField;
    if(style===0){
      const year=month.getFullYear(),m=month.getMonth(),start=new Date(year,m,1),end=new Date(year,m+1,0);
      const previous=new Date(year,m,0),next=new Date(year,m+1,1);
      body='<div class="calendar-head"><button type="button" data-shift="-1" aria-label="Previous month" '+(dayValue(previous)<dayValue(today)?'disabled':'')+'>‹</button><b>'+month.toLocaleDateString(undefined,{month:'long',year:'numeric'})+'</b><button type="button" data-shift="1" aria-label="Next month" '+(dayValue(next)>dayValue(last)?'disabled':'')+'>›</button></div><div class="date-grid">'+['M','T','W','T','F','S','S'].map(x=>'<small>'+x+'</small>').join('')+'<i></i>'.repeat((start.getDay()+6)%7);
      for(let d=1;d<=end.getDate();d++){const val=dayValue(new Date(year,m,d));body+='<button type="button" data-pick="'+val+'" aria-label="'+val+'" aria-pressed="'+(draft.day===val)+'" '+(val<dayValue(today)||val>dayValue(last)?'disabled':'')+'>'+d+'</button>';}
      body+='</div>';
    }else if(style===2){
      body='<div class="date-quick"><button type="button" data-preset="10">In 10 min</button><button type="button" data-preset="60">In an hour</button><button type="button" data-preset="tomorrow">Tomorrow at 9</button></div>'+dateField;
    }
    content.innerHTML=body+'<label>Time<input data-clock type="time" value="'+(draft.clock||'')+'"></label>';
    const day=content.querySelector('[data-day]');if(day)day.oninput=()=>{draft.day=day.value;month=null;};
    content.querySelector('[data-clock]').oninput=e=>draft.clock=e.target.value;
    for(const b of content.querySelectorAll('[data-shift]'))b.onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+Number(b.dataset.shift),1);draw(style);};
    for(const b of content.querySelectorAll('[data-pick]'))b.onclick=()=>{setDate(b.dataset.pick);draw(style);};
    for(const b of content.querySelectorAll('[data-preset]'))b.onclick=()=>{const d=new Date();if(b.dataset.preset==='tomorrow'){d.setDate(d.getDate()+1);d.setHours(9,0,0,0);}else d.setMinutes(d.getMinutes()+Number(b.dataset.preset));setDate(dayValue(d));draft.clock=pad(d.getHours())+':'+pad(d.getMinutes());draw(style);};
  }
  function timing(){panel.hidden=!draft.later;for(const r of host.querySelectorAll('[name=post-time]'))r.checked=(r.value==='later')===draft.later;}
  for(const r of host.querySelectorAll('[name=post-time]'))r.onchange=()=>{draft.later=r.value==='later';timing();};
  wireStyle(panel,'calendar',i=>{panel.dataset.layout=i;draw(i);});timing();
}
