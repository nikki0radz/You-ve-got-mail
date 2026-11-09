import test from 'node:test';
import assert from 'node:assert/strict';
import {createScreenFlash} from '../shop/screen-flash.mjs';
import {captureWithFlash} from '../shop/camera-flash.mjs';
function fixture(timeout=1000){
 const events=[],target=new EventTarget();let ticket;
 const bridge={screenFlash:(on,id)=>{events.push(on?'boost on':'boost off');if(on)ticket=id;}};
 const screen=createScreenFlash({bridge,eventTarget:target,show:on=>events.push(on?'overlay on':'overlay off'),timeout});
 const ack=(applied=true,id=ticket)=>{const event=new Event('pigeon-screen-flash');event.detail={ticket:id,applied};target.dispatchEvent(event);};
 return {screen,ack,events};
}
test('capture waits for the native brightness acknowledgement before exposure settling',async()=>{
 const {screen,ack,events}=fixture();
 const capture=captureWithFlash({facing:'user',enabled:true,screen,settle:async()=>events.push('settle'),linger:async()=>{},capture:()=>{events.push('photo');return 'saved';}});
 assert.deepEqual(events,['overlay on','boost on']);
 ack(true,-1);await Promise.resolve();assert.equal(events.includes('settle'),false);
 ack();assert.equal(await capture,'saved');
 assert.deepEqual(events,['overlay on','boost on','settle','photo','overlay off','boost off']);
});
test('a missing acknowledgement fails visibly and restores brightness without saving',async()=>{
 const {screen,events}=fixture(10);
 await assert.rejects(captureWithFlash({facing:'user',enabled:true,screen,capture:()=>events.push('photo')}),/did not start/);
 assert.deepEqual(events,['overlay on','boost on','overlay off','boost off']);
});
test('a rejected native request never captures and always clears the flash',async()=>{
 const {screen,ack,events}=fixture();
 const pending=captureWithFlash({facing:'user',enabled:true,screen,capture:()=>events.push('photo')});
 ack(false);await assert.rejects(pending,/could not start/);
 assert.deepEqual(events,['overlay on','boost on','overlay off','boost off']);
});
test('closing while awaiting native brightness cancels immediately and ignores late acknowledgement',async()=>{
 const {screen,ack,events}=fixture();
 const pending=screen(true);screen(false);ack();await assert.rejects(pending,/closed/);
 assert.deepEqual(events,['overlay on','boost on','overlay off','boost off']);
});
test('old APKs retain their brightness boost and browsers only light the page',()=>{
 for(const boost of [false,true]){
  const events=[];
  const screen=createScreenFlash({bridge:{settingsAction:key=>events.push(key)},eventTarget:new EventTarget(),boost,show:on=>events.push(on)});
  screen(true);screen(false);
  assert.deepEqual(events,boost?[true,'cameraFlashOn',false,'cameraFlashOff']:[true,false]);
 }
});
test('native bridge errors are propagated and listeners are cleared',async()=>{
 const screen=createScreenFlash({bridge:{screenFlash:()=>{throw Error('Bridge failed');}},eventTarget:new EventTarget(),show:()=>{}});
 await assert.rejects(screen(true),/Bridge failed/);
});
