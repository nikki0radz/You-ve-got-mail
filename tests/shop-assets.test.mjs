import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const repo = new URL('../', import.meta.url);
const load = path => readFile(new URL(path, repo));
const catalog = JSON.parse(await load('assets/post/catalog.json'));
const sheets = new Map();

async function dimensions(path) {
  if (!sheets.has(path)) {
    const bytes = await load(path);
    if(path.endsWith('.svg')){
      const viewBox=/viewBox="0 0 (\d+) (\d+)"/.exec(bytes.toString('utf8'));
      assert.ok(viewBox,path);
      sheets.set(path,viewBox.slice(1).map(Number));
    }else{
      assert.equal(bytes.subarray(1,4).toString(), 'PNG', path);
      sheets.set(path, [bytes.readUInt32BE(16), bytes.readUInt32BE(20)]);
    }
  }
  return sheets.get(path);
}

test('all shop items have distinct names within their collection and usable artwork coordinates', async () => {
  const keys = new Set();
  for (const item of catalog) {
    const key = item.category + '/' + item.name;
    assert.ok(!keys.has(key), key); keys.add(key);
    const [width, height] = await dimensions(item.sheet);
    const [x, y, w, h] = item.rect;
    assert.ok(w > 0 && h > 0 && x >= 0 && y >= 0 && x+w <= width && y+h <= height, key);
    assert.deepEqual([width, height], [item.sheetWidth, item.sheetHeight], key);
    if (item.category === 'Photos' || item.category === 'Postcards') {
      assert.deepEqual(await dimensions(item.maskSheet), [width, height], key);
      const [l, t, r, b] = item.opening;
      assert.ok(0 <= l && l < r && r <= 1 && 0 <= t && t < b && b <= 1, key);
    }
    if (item.category === 'Postcards' || item.category === 'Notes') {
      const [l,t,r,b] = item.textBox;
      assert.ok(0 <= l && l < r && r <= 1 && 0 <= t && t < b && b <= 1, key);
    }
  }
});
