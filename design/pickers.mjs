// Guest category names belong to the real library. Page IDs also identify exported feedback.
export const pickerCategories={notes:'Notes',frames:'Photos',flowers:'Flowers',postcards:'Postcards',pigeons:'Stickers',love:'Love notes',reminders:'Reminders'};
export function pickerRoute(page){
  const [mode,id]=page.split('--'),category=pickerCategories[id];
  return category&&['picker','gallery'].includes(mode)?{category,grid:mode==='gallery'}:null;
}
