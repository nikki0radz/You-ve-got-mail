const pad=n=>String(n).padStart(2,'0');
const dayValue=d=>[d.getFullYear(),pad(d.getMonth()+1),pad(d.getDate())].join('-');

export function dispatchControls(host,draft){
  host.innerHTML='<fieldset class="timing-options" data-base-look="whenticks-1" data-review-look="whenticks-1"><legend data-review-look="timeheading-1" data-base-look="timeheading-1">When should it arrive?</legend><div>'+[['now','Now'],['later','Later']].map(([key,label])=>'<label><input type="radio" name="post-time" value="'+key+'"><span><b>'+label+'</b></span></label>').join('')+'</div></fieldset><section class="schedule-panel" hidden><button type="button" class="schedule-summary" aria-haspopup="dialog"></button><small>Times are local to you · up to 30 days ahead</small></section>';
  const panel=host.querySelector('.schedule-panel'),summary=host.querySelector('.schedule-summary');
  const today=new Date(),last=new Date(today.getTime()+30*86400000);
  function timing(){
    panel.hidden=!draft.later;
    for(const r of host.querySelectorAll('[name=post-time]'))r.checked=(r.value==='later')===draft.later;
    summary.textContent=draft.day&&draft.clock?new Date(draft.day+'T'+draft.clock).toLocaleString(undefined,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' · Change':'Choose date & time';
  }
  function open(){
    const initial=new Date(Date.now()+15*60000);
    const pending={day:draft.day||dayValue(today),clock:draft.clock||pad(initial.getHours())+':'+pad(initial.getMinutes())};
    let month=new Date(pending.day+'T12:00'),step='date';
    const modal=document.createElement('dialog');modal.className='post-scheduler';modal.setAttribute('aria-label','Schedule your parcel');document.body.append(modal);
    const close=(committed=false)=>{if(!committed&&(!draft.day||!draft.clock))draft.later=false;modal.close();modal.remove();timing();summary.focus();};
    modal.oncancel=e=>{e.preventDefault();close();};
    function draw(){
      modal.dataset.reviewScreen=step==='date'?'Schedule / date':'Schedule / time';
      modal.innerHTML='<header><small>PIGEON POST · '+(step==='date'?'1':'2')+' OF 2</small><button type="button" data-cancel aria-label="Cancel schedule">×</button></header><h2>'+(step==='date'?'Pick a date':'Pick a time')+'</h2><div class="scheduler-body"></div><p class="scheduler-error" role="alert"></p><footer><button type="button" data-back>'+(step==='date'?'Cancel':'‹ Back')+'</button>'+(step==='time'?'<button type="button" class="dispatch-submit" data-done>Done 💌</button>':'')+'</footer>';
      modal.querySelector('[data-cancel]').onclick=()=>close();
      modal.querySelector('[data-back]').onclick=()=>{if(step==='date')close();else{step='date';draw();}};
      const body=modal.querySelector('.scheduler-body');
      if(step==='date'){
        const year=month.getFullYear(),m=month.getMonth(),start=new Date(year,m,1),end=new Date(year,m+1,0);
        const previous=new Date(year,m,0),next=new Date(year,m+1,1);
        body.innerHTML='<div class="calendar-head"><button type="button" data-shift="-1" aria-label="Previous month" '+(dayValue(previous)<dayValue(today)?'disabled':'')+'>‹</button><b>'+month.toLocaleDateString(undefined,{month:'long',year:'numeric'})+'</b><button type="button" data-shift="1" aria-label="Next month" '+(dayValue(next)>dayValue(last)?'disabled':'')+'>›</button></div><div class="date-grid">'+['M','T','W','T','F','S','S'].map(x=>'<small>'+x+'</small>').join('')+'<i></i>'.repeat((start.getDay()+6)%7)+Array.from({length:end.getDate()},(_,i)=>{const val=dayValue(new Date(year,m,i+1));return '<button type="button" data-pick="'+val+'" aria-label="'+val+'" '+(val===dayValue(today)?'aria-current="date" ':'')+'aria-pressed="'+(pending.day===val)+'" '+(val<dayValue(today)||val>dayValue(last)?'disabled':'')+'>'+(i+1)+'</button>';}).join('')+'</div><p class="scheduler-hint">Today is underlined. Tap a date to choose its time.</p>';
        for(const b of body.querySelectorAll('[data-shift]'))b.onclick=()=>{month=new Date(year,m+Number(b.dataset.shift),1);draw();};
        for(const b of body.querySelectorAll('[data-pick]'))b.onclick=()=>{pending.day=b.dataset.pick;step='time';draw();};
      }else{
        let [hour,minute]=pending.clock.split(':').map(Number);
        body.innerHTML='<p class="scheduler-day">'+new Date(pending.day+'T12:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'short'})+'</p><div class="time-wheels"><div><small>Hour</small><div class="time-wheel" role="listbox" aria-label="Hour" tabindex="0" data-hours></div></div><b aria-hidden="true">:</b><div><small>Minute</small><div class="time-wheel" role="listbox" aria-label="Minute" tabindex="0" data-minutes></div></div></div>';
        function wheel(el,count,value,update){
          let timer;
          el.innerHTML=Array.from({length:count},(_,i)=>'<button type="button" role="option" tabindex="-1" aria-selected="'+(i===value)+'" data-value="'+i+'">'+pad(i)+'</button>').join('');
          function select(i,scroll){
            value=Math.max(0,Math.min(count-1,i));update(value);
            for(const btn of el.children)btn.setAttribute('aria-selected',String(Number(btn.dataset.value)===value));
            if(scroll)el.scrollTo({top:value*44,behavior:'smooth'});
          }
          for(const b of el.children)b.onclick=()=>select(Number(b.dataset.value),true);
          el.onkeydown=e=>{const delta={ArrowDown:1,ArrowUp:-1,PageDown:5,PageUp:-5}[e.key];if(delta){e.preventDefault();select(value+delta,true);}};
          el.onscroll=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(el.isConnected)select(Math.round(el.scrollTop/44),false);},100);};
          requestAnimationFrame(()=>{if(el.isConnected)el.scrollTop=value*44;});
        }
        wheel(body.querySelector('[data-hours]'),24,hour,v=>{hour=v;pending.clock=pad(hour)+':'+pad(minute);});
        wheel(body.querySelector('[data-minutes]'),60,minute,v=>{minute=v;pending.clock=pad(hour)+':'+pad(minute);});
        modal.querySelector('[data-done]').onclick=()=>{
          hour=Math.round(body.querySelector('[data-hours]').scrollTop/44);minute=Math.round(body.querySelector('[data-minutes]').scrollTop/44);pending.clock=pad(hour)+':'+pad(minute);
          const when=new Date(pending.day+'T'+pending.clock).getTime();
          if(when<=Date.now()||when>Date.now()+30*86400000){modal.querySelector('.scheduler-error').textContent='Choose a future time within 30 days.';return;}
          Object.assign(draft,pending);draft.later=true;close(true);
        };
      }
    }
    draw();modal.showModal();
  }
  summary.onclick=open;
  for(const r of host.querySelectorAll('[name=post-time]'))r.onchange=()=>{draft.later=r.value==='later';timing();if(draft.later)open();};
  timing();
}
