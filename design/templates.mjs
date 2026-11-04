import {released} from './released-buttons.mjs';
import {appearanceCSS} from './appearance.mjs';
// Released Pigeon Post controls, followed by alternate treatments for experimentation.
const cream='#faf4e5',green='#365a40',ink='#294938';
const pill={color:ink,background:cream,borderColor:'#9aa68c',borderWidth:1,radius:30,height:44,fontSize:15,font:'system-ui'};
const names={submit:'Forest submit',dock:'Pocket dock',back:'Pocket pill Back',accept:'Invitation accept',quiet:'Invitation decline',edit:'Pencil edit',remove:'Bin action',gallery:'See all',timing:'Timing selected','timing-off':'Timing unselected',active:'Selected sticker dock',colour:'Use colour',cancel:'Colour cancel',tab:'Connected note tab',photo:'Photo upload','edit-parcel':'Edit parcel',reply:'Reply choice'};
export const buttons={
 ...Object.fromEntries(Object.entries(names).map(([id,name])=>{const v=released[id],d=v.decor;return [id,[name,v,d.boxShadow,d.fontWeight,d.textDecorationLine]]})),

 stamp:['Postage stamp',{...pill,radius:3,borderWidth:2,font:'Georgia',color:'#703c36',borderColor:'#a66a59'},'2px 2px 0 #decbbb',700],
 airmail:['Airmail label',{...pill,radius:6,borderColor:'#61778a',color:'#344c62',background:'#f3f4ec'},'0 2px 0 #bdc8c8',650],
 telegram:['Telegram',{...pill,radius:4,font:'monospace',background:'#f4e6b9',borderColor:'#ae995a'},'none',700],
 postal:['Postal ink',{...pill,radius:8,background:'#293e40',color:'#fff9e8',borderColor:'#293e40'},'none',700],
 wax:['Wax seal',{...pill,radius:26,background:'#814d49',color:'#fff7e6',borderColor:'#653934'},'0 3px 0 #653934',700],
 lilac:['Lilac envelope',{...pill,radius:12,background:'#e7dfef',color:'#49395a',borderColor:'#aa97b4'},'none',650],
 brass:['Brass label',{...pill,radius:6,background:'#e8d5a8',color:'#443921',borderColor:'#a28a52'},'inset 0 0 0 2px #f6e8c5',700],
 inkline:['Ink underline',{...pill,radius:0,borderWidth:0,color:'#274a39'},'inset 0 -2px 0 #56785e',700]
};
export const layouts={
 pair:['Pocket pair','row',5,'stretch'],airy:['Airy pair','row',14,'stretch'],compact:['Compact pair','row',2,'stretch'],separate:['Wide gutter','row',22,'stretch'],
 start:['Left cluster','row',6,'flex-start'],center:['Centred cluster','row',9,'center'],end:['Right cluster','row',6,'flex-end'],spread:['Spread apart','row',8,'space-between'],
 stack:['Vertical stack','column',8,'stretch'],stacktight:['Tight stack','column',2,'stretch'],stackair:['Airy stack','column',16,'stretch'],grid:['Two-column grid','grid',8,'stretch'],
 gridtight:['Compact grid','grid',3,'stretch'],gridair:['Gallery grid','grid',14,'stretch'],three:['Three across','three',6,'stretch'],wrap:['Wrapping chips','wrap',7,'center']
};
export const themes={
 original:['Released layout',null],counter:['Post office counter','dock','pair','Georgia'],telegram:['Telegram desk','telegram','stacktight','monospace'],keepsake:['Keepsake album','lilac','airy','Georgia'],airmail:['Airmail desk','airmail','grid','system-ui'],stamp:['Stamp book','stamp','wrap','Georgia'],formal:['Ink & brass','brass','spread','Georgia'],quiet:['Quiet stationery','inkline','center','system-ui'],night:['Postal ink','postal','stack','system-ui']
};
export function extraCSS(s){
  const t=buttons[s.skin],l=layouts[s.arrangement];let css={};
  if(t){css.fontWeight=t[3];css.boxShadow=t[2];css.textDecoration=t[4]||'none';if(s.skin==='tab')css.borderRadius='18px 18px 0 0';}
  if(l){const [,kind,,pos]=l;css.display=['grid','three'].includes(kind)?'grid':'flex';css.flexDirection=kind==='column'?'column':'row';css.flexWrap=kind==='wrap'?'wrap':'nowrap';css.justifyContent=pos==='stretch'?'initial':pos;css.alignItems=pos==='stretch'?'stretch':'center';if(css.display==='grid')css.gridTemplateColumns='repeat('+(kind==='three'?3:2)+',minmax(0,1fr))';}
  return {...css,...appearanceCSS(s.decor)};
}
export function propsForSkin(id){return {...buttons[id][1],skin:id};}
