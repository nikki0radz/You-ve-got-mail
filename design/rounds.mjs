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
rounds.home.groups.push(reviewGroup('status','Open and closed status','.post-office-controls'));
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
  ['recipient','Recipient','.recipient-choice','.recipient-choice'],
  ['deliverytime','Now / Later','.timing-options, .dispatch-timing','.timing-options, .dispatch-timing'],
  ['mailbox','Inbox layout','.mailbox-layout','.mailbox-layout .page-heading'],
  ['settingsbuttons','Settings buttons','.post-settings','.post-setting[data-section="alerts"] summary']
].map(([key,title,selector,anchor])=>({
  ...reviewGroup(key,title,selector),key,selector,anchor,id:'frame-feedback-'+key+'-01'
}));
const [recipient,time,mailbox,settings]=feedbackGroups;
rounds.recipient={...recipient,groups:[time]};rounds.schedule=rounds.recipient;
rounds.inbox=mailbox;rounds.sent=mailbox;rounds.settings=settings;

rounds.dispatch.groups=rounds.dispatch.groups.map(group=>group.id==='parcel-review-timing-01'?time:group);
