import test from 'node:test';
import assert from 'node:assert/strict';
import {findFrameOpening,sharedDesigns,useSharedRecords,shopCategoryName} from '../shop/shared-designs.mjs';

test('imports preserve the master, type and writing coordinates even in a custom category',()=>{
  const entry={id:'postcard-1',category:'Tea break',kind:'postcard',name:'',width:1600,height:2400,
    src:'blob:postcard',textArea:{x:.125,y:.25,w:.75,h:.375,rotation:-12}};
  useSharedRecords(()=>[entry,{...entry,id:'sticker-1',category:'Stickers',kind:'sticker',textArea:null},
    {...entry,id:'flower-1',category:'Flowers',kind:'flowers',textArea:null}]);
  try {
    const [card,sticker,flowers]=sharedDesigns();
    assert.equal(shopCategoryName(card.category),'Tea break');
    assert.equal(card.useLabel,'Use this postcard');
    assert.equal(card.name,'Tea break');
    assert.equal(card.master,entry.src);
    assert.deepEqual(card.rect,[0,0,1600,2400]);
    assert.deepEqual(card.textBox,[.125,.25,.875,.625]);
    assert.equal(card.textRotation,-12);
    assert.equal(card.deliveryKind,'a postcard');
    assert.equal(shopCategoryName(sticker.category),'Stickers');
    assert.equal(shopCategoryName('Stickers'),'Pigeons');
    assert.equal(flowers.useLabel,'Use these flowers');
  }finally{useSharedRecords(()=>[]);}
});

test('an imported photo frame masks the enclosed opening and leaves outside padding transparent',()=>{
  const size=12,pixels=new Uint8Array(size*size*4);
  for(let y=2;y<=9;y++)for(let x=2;x<=9;x++){
    if(y===2||y===9||x===2||x===9)pixels[(y*size+x)*4+3]=255;
  }
  const hole=findFrameOpening(pixels,size,size);
  assert.equal(hole.pixels.length,36);
  assert.deepEqual(hole.opening,[.25,.25,.75,.75]);
  pixels[(2*size+5)*4+3]=0;
  assert.equal(findFrameOpening(pixels,size,size),null);
});
