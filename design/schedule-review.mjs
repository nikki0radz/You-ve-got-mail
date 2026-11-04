// A working review calendar writes to the existing delivery date field.
export function calendarPreview(label,look){
  let panel=label.querySelector('.schedule-review');
  if(!look){panel?.remove();return;}
  if(panel)return;
  const input=label.querySelector('#when'),now=new Date();
  let selected=input.value?new Date(input.value):new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,12,0);
  let month=new Date(selected.getFullYear(),selected.getMonth(),1);
  panel=document.createElement('div');panel.className='schedule-review';
  label.append(panel);
  const pad=n=>String(n).padStart(2,'0');
  function value(){
    input.value=selected.getFullYear()+'-'+pad(selected.getMonth()+1)+'-'+pad(selected.getDate())+'T'+pad(selected.getHours())+':'+pad(selected.getMinutes());
    input.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function draw(){
    panel.replaceChildren();
    const nav=document.createElement('div');nav.className='calendar-nav';
    const previous=document.createElement('button'),next=document.createElement('button'),heading=document.createElement('b');
    previous.type=next.type='button';previous.textContent='‹';next.textContent='›';previous.setAttribute('aria-label','Previous month');next.setAttribute('aria-label','Next month');
    heading.textContent=month.toLocaleDateString(undefined,{month:'long',year:'numeric'});
    previous.onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()-1,1);draw()};
    next.onclick=()=>{month=new Date(month.getFullYear(),month.getMonth()+1,1);draw()};
    nav.append(previous,heading,next);panel.append(nav);
    const grid=document.createElement('div');grid.className='calendar-days';
    for(const day of ['M','T','W','T','F','S','S']){const span=document.createElement('span');span.textContent=day;grid.append(span)}
    for(let i=0;i<(month.getDay()+6)%7;i++)grid.append(document.createElement('span'));
    const today=new Date();today.setHours(0,0,0,0);const end=new Date(today);end.setDate(end.getDate()+30);
    for(let day=1;day<=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();day++){
      const date=new Date(month.getFullYear(),month.getMonth(),day),button=document.createElement('button');
      button.type='button';button.textContent=day;button.disabled=date<today||date>end;
      button.setAttribute('aria-label',date.toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
      button.setAttribute('aria-pressed',String(date.toDateString()===selected.toDateString()));
      button.onclick=()=>{selected.setFullYear(date.getFullYear(),date.getMonth(),date.getDate());value();draw()};grid.append(button);
    }
    panel.append(grid);
    const row=document.createElement('div');row.className='calendar-time';row.append('Time');
    for(const [part,max,current] of [['hour',23,selected.getHours()],['minute',59,selected.getMinutes()]]){
      const select=document.createElement('select');select.setAttribute('aria-label',part);
      for(let n=0;n<=max;n++){const option=document.createElement('option');option.value=n;option.textContent=pad(n);option.selected=n===current;select.append(option)}
      select.onchange=()=>{if(part==='hour')selected.setHours(Number(select.value));else selected.setMinutes(Number(select.value));value()};
      row.append(select);
      if(part==='hour')row.append(':');
    }
    panel.append(row);
  }
  draw();
}
