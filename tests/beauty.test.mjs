import test from 'node:test';
import assert from 'node:assert/strict';
import {blendBeautyPixels} from '../shop/beauty-pixels.mjs';
import {beautyEnabled,setBeautyEnabled} from '../shop/beauty-pref.mjs';
const image=(...values)=>({data:new Uint8ClampedArray(values)});
test('natural beauty defaults on and remembers an explicit off choice',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
 assert.equal(beautyEnabled(storage),true);setBeautyEnabled(false,storage);assert.equal(beautyEnabled(storage),false);setBeautyEnabled(true,storage);assert.equal(beautyEnabled(storage),true);
});
test('a blocked settings store still remembers the beauty choice for this session',()=>{
 const storage={getItem(){throw Error('Blocked');},setItem(){throw Error('Blocked');}};
 setBeautyEnabled(false,storage);assert.equal(beautyEnabled(storage),false);
 setBeautyEnabled(true,{setItem(){},getItem:()=>null});
});
test('background, eyes, lips and transparent pixels stay unchanged outside the face-skin mask',()=>{
 const original=image(90,50,35,255, 80,40,30,0),before=original.data.slice();
 blendBeautyPixels(original,image(95,55,40,255,255,255,255,255),image(0,0,0,0,255,255,255,255),image(0,0,0,0,0,0,0,0));assert.deepEqual(original.data,before);
});
test('smoothing gently reduces texture while preserving strong facial edges',()=>{
 const original=image(165,125,100,255, 35,25,15,255);
 blendBeautyPixels(original,image(170,130,105,255,100,90,80,255),image(255,255,255,255,255,255,255,255),image(0,0,0,0,0,0,0,0));
 assert.ok(original.data[0]>165&&original.data[0]<=167);assert.deepEqual([...original.data.slice(4)],[35,25,15,255]);
});
test('teeth whitening reduces a slight yellow cast only inside the detected open mouth',()=>{
 const original=image(210,200,160,255, 210,200,160,255);
 blendBeautyPixels(original,image(...original.data),image(0,0,0,0,0,0,0,0),image(255,255,255,255,0,0,0,0));
 assert.ok(original.data[2]>160&&original.data[2]<=174);assert.ok(original.data[0]-210<4);assert.deepEqual([...original.data.slice(4)],[210,200,160,255]);
});
test('red lips, gums and a dark mouth are never whitened',()=>{
 const original=image(190,95,100,255, 50,35,25,255),before=original.data.slice();
 blendBeautyPixels(original,image(...original.data),image(0,0,0,0,0,0,0,0),image(255,255,255,255,255,255,255,255));assert.deepEqual(original.data,before);
});
