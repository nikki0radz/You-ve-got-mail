// Only face skin is softened. Eye, eyebrow and lip masks preserve detail.
export function blendBeautyPixels(original,softened,skinMask,teethMask){
 const a=original.data,b=softened.data,s=skinMask.data,t=teethMask.data;
 for(let i=0;i<a.length;i+=4){
  if(!a[i+3])continue;
  if(s[i+3]){
   const edge=Math.abs((a[i]*.2126+a[i+1]*.7152+a[i+2]*.0722)-(b[i]*.2126+b[i+1]*.7152+b[i+2]*.0722));
   const amount=.30*(s[i+3]/255)*Math.max(0,1-edge/20);
   for(let c=0;c<3;c++)a[i+c]+= (b[i+c]-a[i+c])*amount;
  }
  if(t[i+3]){
   const r=a[i],g=a[i+1],blue=a[i+2],light=r*.2126+g*.7152+blue*.0722;
   // Leave dark mouth pixels, lips and gums alone; retain tooth shading.
   if(light>105&&r-g<32&&g-blue<75&&Math.max(r,g,blue)-Math.min(r,g,blue)<85){
    const strength=.20*t[i+3]/255,lift=(255-light)*.04;
    a[i]=Math.min(255,r+lift);a[i+1]=Math.min(255,g+lift);
    a[i+2]=Math.min(255,blue+(Math.max(r,g)-blue)*strength+lift);
   }
  }
 }
 return original;
}

export const faceOval=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
export const eyes=[[33,7,163,144,145,153,154,155,133,173,157,158,159,160,161,246],[263,249,390,373,374,380,381,382,362,398,384,385,386,387,388,466]];
export const brows=[[70,63,105,66,107,55,65,52,53,46],[300,293,334,296,336,285,295,282,283,276]];
export const outerLips=[61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185];
export const innerLips=[78,95,88,178,87,14,317,402,318,324,308,415,310,311,312,13,82,81,80,191];
