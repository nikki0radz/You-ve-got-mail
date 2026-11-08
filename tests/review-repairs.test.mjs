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
