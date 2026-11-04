import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {guestItems} from '../shop/guest-selection.mjs';

test('the one-use collection maps to the approved numbered designs and scalable artwork',async()=>{
  const catalog=JSON.parse(await readFile(new URL('../assets/post/catalog.json',import.meta.url)));
  const picks=guestItems(catalog);
  const numbers=[2,3,6,21,54,51,47,36,31,65,75,86,88,105,108,91,102,162,163,173,179,192,193,194,196];
  assert.equal(picks.length,numbers.length);
  for(const [i,item] of picks.entries()){
    const original=catalog[numbers[i]-1];
    assert.equal(item.name,original.name);
    assert.equal(item.category,original.category);
    assert.match(await readFile(new URL('../'+item.master,import.meta.url),'utf8'), /viewBox="0 0 \d+ \d+"/);
  }
  assert(catalog.every(item=>!item.master));
});
