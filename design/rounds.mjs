// Add reviewed alternatives here using a new ID for each round. Keep the same ID when correcting copy.
export const rounds={
  home:{id:'home-actions-01',title:'Home action row',options:[
    ['Pocket pair','pair'],['Wider gap','airy'],['Centred pair','center'],['Tight stack','stacktight'],['Airy stack','stackair'],['Two columns','grid']
  ].map(([name,arrangement])=>({name,changes:[{selector:'.home-actions',style:{arrangement,gap:({pair:5,airy:14,center:9,stacktight:2,stackair:16,grid:8})[arrangement]}}]}))}
};
