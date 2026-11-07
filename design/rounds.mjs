import {propsForSkin} from './templates.mjs';
// Add reviewed alternatives here using a new ID for each round. Keep the same ID when correcting copy.
export const rounds={
  home:{id:'home-actions-01',title:'Home action row',options:[
    ['Pocket pair','pair'],['Wider gap','airy'],['Centred pair','center'],['Tight stack','stacktight'],['Airy stack','stackair'],['Two columns','grid']
  ].map(([name,arrangement])=>({name,changes:[{selector:'.home-actions',style:{arrangement,gap:({pair:5,airy:14,center:9,stacktight:2,stackair:16,grid:8})[arrangement]}}]}))}
};

rounds.home.groups=[{id:'home-invite-button-01',title:'One-time link button',options:[
  ['Pocket dock','dock'],['Forest submit','submit'],['Postage stamp','stamp'],
  ['Airmail label','airmail'],['Wax seal','wax'],['Ink underline','inkline']
].map(([name,skin])=>({name,changes:[{selector:'.home-actions [data-action="test-link"]',style:propsForSkin(skin)}]}))}];

import {reviewGroup} from './parcel-round.mjs';
rounds.home.groups.push(reviewGroup('header','Pigeon and mail status','.courier-stand'));
// Keep this retired slider group's position so saved review comments retain their option numbers.
rounds.home.groups.push(reviewGroup('status','Open and closed status','.mail-toggle-track'));
rounds.home.groups.push(reviewGroup('background','Home background','#app'),reviewGroup('title','App title','.postal-header > strong'));
rounds.dispatch=reviewGroup('heading','Delivery heading','#steps > h2');
rounds.dispatch.groups=[
  reviewGroup('name','Sender name','.sender-label'),
  reviewGroup('timing','Delivery timing','.dispatch-timing'),
  reviewGroup('calendar','Date selector','#when-label')
];

rounds.decline=reviewGroup('decline','Pigeon choice','.decline-pigeon');

// One versioned group per decision, shared by the phone and the workroom.
export const feedbackGroups=[
  ['sendrow','Send to','.recipient-choice','.recipient-choice'],
  ['whenticks','Now / Later','.timing-options, .dispatch-timing','.timing-options, .dispatch-timing'],
  ['mailbox','Inbox layout','.mailbox-layout','.mailbox-layout .page-heading'],
  ['settingsbuttons','Settings buttons','.post-settings','.post-setting[data-section="alerts"] summary'],
  ['peoplebar','Your people','.people-heading','.people-heading'],
  ['railwidth','Carousel width','.frame-card','.frame-card'],
  ['notetitle','Optional note heading','.note-question','.note-question'],
  ['catalogfont','Design name font','.frame-name','.frame-name'],
  ['receiptfont','Parcel title font','.post-receipt > strong','.post-receipt > strong'],
  ['recipientfont','Recipient lettering','.recipient-people','.recipient-people'],
  ['timeheading','Timing heading','.timing-options legend, .dispatch-timing legend','.timing-options legend, .dispatch-timing legend'],
  ['permissionactions','Permission buttons','.permission-list','.permission-list'],
  ['separator','Home divider','#home-wheel > .wheel > p','#home-wheel > .wheel > p'],
  ['wheelrim','Category artwork surround','#home-wheel .category-reel','#home-wheel .category-reel']
].map(([key,title,selector,anchor])=>({
  ...reviewGroup(key,title,selector),key,selector,anchor,id:['mailbox','settingsbuttons'].includes(key)?'frame-feedback-'+key+'-01':'parcel-feedback-'+key+(['sendrow','catalogfont','receiptfont'].includes(key)?'-03':'-02')
}));
const [recipient,time,mailbox,settings,people,rail,note,catalogFont,receiptFont,recipientFont,timeHeading,permissionActions]=feedbackGroups;
rounds.recipient={...recipient,groups:[time,recipientFont,timeHeading]};rounds.schedule=rounds.recipient;
rounds.inbox={...mailbox,groups:[people]};rounds.sent=rounds.inbox;
for(const page of ['library','stickerPicker','picker--pigeons','picker--notes','picker--postcards','picker--reminders','picker--flowers','picker--love'])rounds[page]={...rail,groups:[catalogFont]};
rounds.posted=receiptFont;
for(const page of ['banners','notes','love','flowers','reminders','pigeons','placementFrame','placementPostcard'])rounds[page]=note;
rounds.settings={...settings,groups:[permissionActions]};rounds.dispatch.groups.push(timeHeading);

rounds.dispatch.groups=rounds.dispatch.groups.map(group=>group.id==='parcel-review-timing-01'?time:group);

rounds.home.groups.push(...feedbackGroups.filter(group=>['separator','wheelrim'].includes(group.key)));
// The selected looks stay in the exported workroom vocabulary for older reviews.
export const approvedLooks = {mailbox:3, settingsbuttons:3, peoplebar:4, railwidth:1, notetitle:3, receiptfont:2, permissionactions:5};
