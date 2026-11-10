import test from 'node:test';
import assert from 'node:assert/strict';
import {repairLatestReview} from '../design/review-repairs.mjs';
function storage(entries){
 const value=Object.fromEntries(Object.entries(entries).map(([key,item])=>[key,JSON.stringify(item)]));
 Object.defineProperties(value,{getItem:{value:key=>value[key]??null},setItem:{value:(key,item)=>value[key]=item}});return value;
}
test('restoring the Pigeons background keeps other colours and review comments',()=>{
 const key='pigeon.live-review.v1.home',pigeon='#home-wheel .category-reel button > span',other='#home-wheel .category-reel button:nth-of-type(3) > span';
 const local=storage({[key]:{surface:'app',view:'home',theme:'light',targets:{[pigeon]:{atSelection:{design:'Browse pigeons'},colours:{background:'#ff0000',text:'#111c19'},comment:'Keep this comment'},[other]:{atSelection:{design:'Browse photo frames'},colours:{background:'#f2d5bf'}}}}});
 repairLatestReview(local);const targets=JSON.parse(local.getItem(key)).targets;
 assert.equal(targets[pigeon].colours.background,undefined);assert.equal(targets[pigeon].colours.text,'#111c19');assert.equal(targets[pigeon].comment,'Keep this comment');assert.equal(targets[other].colours.background,'#f2d5bf');
 targets[pigeon].colours.background='#597c66';local.setItem(key,JSON.stringify({surface:'app',view:'home',theme:'light',targets}));repairLatestReview(local);
 assert.equal(JSON.parse(local.getItem(key)).targets[pigeon].colours.background,'#597c66','later deliberate choices remain editable');
});
test('magnolia correction covers both light mailbox tabs without touching dark mode',()=>{
 const inbox='pigeon.live-review.v1.inbox',sent='pigeon.live-review.v1.sent',dark='pigeon.live-review.v1.dark';
 const record=(view,theme)=>({surface:'app',view,theme,targets:{'#app':{colours:{background:'#fff9ed',text:'#365a40'}}}});
 const local=storage({[inbox]:record('inbox / inbox','light'),[sent]:record('inbox / sent','light'),[dark]:record('inbox / inbox','dark')});repairLatestReview(local);
 for(const key of [inbox,sent])assert.deepEqual(JSON.parse(local.getItem(key)).targets['#app'].colours,{background:'#f8f1dd',text:'#365a40'});
 assert.equal(JSON.parse(local.getItem(dark)).targets['#app'].colours.background,'#fff9ed');
});
test('existing phones receive consistent mailbox surfaces and selected tab without changing green controls',()=>{
 const key='pigeon.live-review.v1.mailbox',linked='pigeon.linked-navigation.v1.light';
 const local=storage({[key]:{surface:'app',view:'inbox / sent',theme:'light',targets:{'.mailbox-heading > img':{colours:{background:'#fff9ed'},comment:'Keep artwork'},'.people-heading':{colours:{background:'#faf4e5'}},'.mail-row span':{colours:{background:'#fff9ed',text:'#365a40'}},'.people-heading button':{colours:{background:'#365a40'}}}},[linked]:{'#app .mail-tabs button[aria-pressed=true]':{colours:{background:'#fff9ed'}},'#app .app-nav button[aria-current=page]':{colours:{background:'#365a40'}}}});
 local.setItem('pigeon.repair.circles-inbox.036','1');repairLatestReview(local);
 const targets=JSON.parse(local.getItem(key)).targets,nav=JSON.parse(local.getItem(linked));
 for(const selector of ['.mailbox-heading > img','.mail-row span'])assert.equal(targets[selector].colours.background,'#f8f1dd');
 assert.equal(targets['.mailbox-heading > img'].comment,'Keep artwork');assert.equal(targets['.mail-row span'].colours.text,'#365a40');assert.equal(targets['.people-heading button'].colours.background,undefined);
 assert.equal(nav['#app .mail-tabs button[aria-pressed=true]'].colours.background,'#f8f1dd');assert.equal(nav['#app .app-nav button[aria-current=page]'].colours.background,'#365a40');
 targets['.people-heading'].colours.background='#fff9ed';local.setItem(key,JSON.stringify({surface:'app',view:'inbox / sent',theme:'light',targets}));repairLatestReview(local);
 assert.equal(JSON.parse(local.getItem(key)).targets['.people-heading'].colours.background,'#fff9ed');
});

test('all separator options survive saved-layout validation',async()=>{
 const {cleanLayout}=await import('../design/model.mjs');
 for(let option=1;option<=6;option++){
  const reviewLook='recipientdivider-'+option;
  assert.equal(cleanLayout({styles:{'view-divider':{reviewLook}}}).styles['view-divider'].reviewLook,reviewLook);
 }
});

test('plain Your people removes old heading fills while retaining comments and friend card colours',()=>{
 const key='pigeon.live-review.v1.people',local=storage({[key]:{surface:'app',view:'inbox / inbox',theme:'dark',targets:{
  '#app .people-heading':{colours:{background:'#365a40',text:'#fff9ed'},comment:'Keep this comment'},
  '#app .people-toggle':{colours:{background:'#365a40'}},
  '.mail-friend':{colours:{background:'#365a40'}},
  '.people-heading [data-book]':{colours:{background:'#365a40'}}
 }}});
 repairLatestReview(local);const targets=JSON.parse(local.getItem(key)).targets;
 assert.deepEqual(targets['#app .people-heading'].colours,{});assert.equal(targets['#app .people-heading'].comment,'Keep this comment');
 assert.equal(targets['#app .people-toggle'].colours.background,undefined);
 assert.equal(targets['.mail-friend'].colours.background,'#365a40');assert.equal(targets['.people-heading [data-book]'].colours.background,'#365a40');
});
