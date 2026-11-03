import{test}from'node:test';
import assert from'node:assert/strict';
import{createState,loadState,validateMessage,makeMessage,escapeHtml}from'../domain.mjs';
const valid=()=>({recipient:'owen',type:'message',text:'Oi.',frame:'bubble',colour:'lagoon',when:null});
test('loud ringing starts off and local codes differ',()=>{const a=createState(),b=createState();assert.ok(a.friends.every(f=>f.ring===false));assert.match(a.profile.code,/^[A-F0-9]{10}$/);assert.notEqual(a.profile.code,b.profile.code)});
test('invalid storage restores a usable default',()=>{for(const raw of['broken','null','{}','{"version":1,"inbox":[]}'])assert.equal(loadState(raw).version,1);assert.equal(loadState(JSON.stringify({...createState(),theme:'bad'})).theme,'dark')});
test('missing content and invalid scheduling cannot complete',()=>{assert.equal(validateMessage(valid()),null);assert.ok(validateMessage({...valid(),text:'   '}));assert.ok(validateMessage({...valid(),type:'picture',image:''}));assert.ok(validateMessage({...valid(),frame:'unknown'}));assert.ok(validateMessage({...valid(),when:'not-a-date'}));assert.ok(validateMessage({...valid(),when:'2020-01-01T12:00'}))});
test('test receipt keeps frame, colour and content',()=>{const d={...valid(),frame:'stamp',colour:'apricot'};const m=makeMessage(d,123);assert.equal(m.createdAt,123);assert.equal(m.frame,'stamp');assert.equal(m.colour,'apricot');assert.equal(m.text,'Oi.');assert.equal(m.read,false);assert.ok(m.id)});
test('user text is escaped before HTML display',()=>{assert.equal(escapeHtml('<img src=x onerror="oops">'),'&lt;img src=x onerror=&quot;oops&quot;&gt;')});
