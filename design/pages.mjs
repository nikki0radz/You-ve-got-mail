export const pages={
 'postcard-composer':['Postcard composer','Composer'],home:['Home','Main app'],inbox:['Inbox','Main app'],sent:['Sent mail','Main app'],thread:['Parcel thread','Main app'],friends:['Friends','Main app'],reply:['Reply to sender','Main app'],quick:['Quick text reply','Main app'],profile:['My profile','Main app'],avatar:['Choose pigeon','Main app'],rename:['Edit profile name','Main app'],recipient:['Recipient & timing','Main app'],schedule:['Schedule calendar','Main app'],posted:['Parcel sent','Main app'],arrival:['In-app arrival','Main app'],settings:['Settings','Main app'],defaults:['Message style','Main app'],about:['About','Main app'],
 invitation:['Invitation','One-time link'],decline:['Declined invitation','One-time link'],categories:['Category wheel','One-time link'],library:['Design library','One-time link'],gallery:['Full gallery','One-time link'],notes:['Note composer','One-time link'],frames:['Photo frame upload','One-time link'],flowers:['Flower composer','One-time link'],pigeons:['Pigeon composer','One-time link'],love:['Love-note composer','One-time link'],reminders:['Reminder composer','One-time link'],crop:['Fit photo','One-time link'],banners:['Optional parcel note','One-time link'],ink:['Colour wheel','One-time link'],dispatch:['Send or schedule','One-time link'],loading:['Preparing delivery','One-time link'],receipt:['Delivery receipt','One-time link']
};

import {pickerCategories} from './pickers.mjs';
for(const [id,category] of Object.entries(pickerCategories)){
  if(id==='frames')continue; // Existing bookmarks use "library" and "gallery".
  const label=id==='pigeons'?'Pigeons':category;
  pages['picker--'+id]=[label+' picker','One-time link'];
  pages['gallery--'+id]=[label+' full gallery','One-time link'];
}
pages.placementFrame=['Place a framed photo','One-time link'];
pages.placementPostcard=['Place a postcard','One-time link'];
pages.library[0]='Photo frames picker';
pages.gallery[0]='Photo frames full gallery';
pages.stickerPicker=['Sticker library','One-time link'];
pages.replyPicker=['Reply category picker','Main app'];
pages.datePicker=['Guest schedule picker','One-time link'];
