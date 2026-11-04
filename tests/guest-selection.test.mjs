import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {guestItems,guestSelection} from '../shop/guest-selection.mjs';

test('guest artwork and masked frames match the approved collections',async()=>{
  const catalog=JSON.parse(await readFile(new URL('../assets/post/catalog.json',import.meta.url)));
  const picks=guestItems(catalog);
  const ids=Object.values(guestSelection).flat().map(([id])=>id);
  assert.deepEqual(ids,[2,3,6,21,54,51,47,36,31,65,75,86,88,105,108,91,102,125,126,163,151,159,162,'L01','L10','L11','L20','L03','R01','R09','R27','R15']);
  for(const [i,item] of picks.entries()){
    const id=ids[i];
    const full=catalog.find(entry=>entry.name===item.name && entry.category===item.category);
    assert.ok(full,item.name);
    assert.deepEqual(item.rect,full.rect);
    assert.match(await readFile(new URL('../'+item.master,import.meta.url),'utf8'), /viewBox="0 0 \d+ \d+"/);
    if(item.category==='Photos')assert(await readFile(new URL('../assets/guest/wheel-'+String(id).padStart(3,'0')+'.webp',import.meta.url)));
  }
  assert.deepEqual(catalog.filter(it=>it.category==='Love notes').map(it=>it.name),guestSelection['Love notes'].map(([,name])=>name));
  assert.equal(catalog.filter(it=>it.category==='Reminders').length,30);
  assert.equal(catalog.filter(it=>it.category==='Notes').length,30);
  assert.ok(catalog.every(it=>Object.hasOwn(guestSelection,it.category)));
});
