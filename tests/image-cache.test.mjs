import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function loader(){
 const source=await readFile(new URL('../shop/compositor.mjs',import.meta.url),'utf8');
 const requests=[];
 class Image{set src(url){requests.push(url);queueMicrotask(()=>url.includes('fail')?this.onerror():this.onload());}}
 const scope={Image,queueMicrotask};
 vm.runInNewContext(source.slice(source.indexOf('const sheets'),source.indexOf('export function writeText')).replace('export function loadSheet','function loadSheet')+'\nthis.loadSheet=loadSheet;',scope);
 return {load:scope.loadSheet,requests};
}
test('remote originals use a bounded cache and retain recently used artwork',async()=>{
 const {load,requests}=await loader();
 for(const key of ['a','b','c','d'])await load('https://example.test/'+key);
 await load('https://example.test/a');await load('https://example.test/e');
 await load('https://example.test/a');assert.equal(requests.length,5);
 await load('https://example.test/b');assert.equal(requests.length,6,'oldest original should be released');
});
test('temporary originals stay bounded and failed artwork can retry',async()=>{
 const {load,requests}=await loader();
 for(const key of ['a','b','c'])await load('data:'+key);
 await load('data:a');assert.equal(requests.length,4);
 await assert.rejects(load('https://example.test/fail'));
 await assert.rejects(load('https://example.test/fail'));
 assert.equal(requests.filter(url=>url.endsWith('fail')).length,2);
});
