import test from 'node:test';import assert from 'node:assert/strict';
import {sortArtwork,alphaBounds,cropArea} from '../shop/art-tools.mjs';
test('upload order uses timestamps, with stable ties, rather than hashes or edit sequence',()=>{
 const old={id:'aaa',uploadedAt:100,name:'Z',seq:500},recent={id:'zzz',uploadedAt:200,name:'A',seq:1},bundled={id:'builtin-1',name:'B'};
 assert.deepEqual(sortArtwork([old,recent,bundled]).map(r=>r.id),['zzz','aaa','builtin-1']);assert.deepEqual(sortArtwork([recent,old],'oldest').map(r=>r.id),['aaa','zzz']);assert.deepEqual(sortArtwork([old,recent,bundled],'name').map(r=>r.name),['A','B','Z']);assert.equal(old.seq,500);
});
test('automatic trimming keeps faint edge pixels and holes, and detects empty artwork',()=>{
 const pixels=new Uint8Array(6*5*4);pixels[(1*6+2)*4+3]=1;pixels[(3*6+4)*4+3]=255;assert.deepEqual(alphaBounds(pixels,6,5),{x:2,y:1,w:3,h:3});assert.equal(alphaBounds(new Uint8Array(16),2,2),null);
});
test('cropping keeps photo and text areas within the new image and preserves rotation',()=>{
 const actual=cropArea({x:.25,y:.25,w:.5,h:.5,rotation:12},{x:20,y:20,w:60,h:60},100,100);for(const [key,value] of Object.entries({x:1/12,y:1/12,w:5/6,h:5/6,rotation:12}))assert(Math.abs(actual[key]-value)<1e-12);
 const edge=cropArea({x:.8,y:.8,w:.2,h:.2},{x:0,y:0,w:10,h:10},100,100);assert(edge.x+edge.w<=1&&edge.y+edge.h<=1);assert.equal(cropArea(null,{},1,1),null);
});
