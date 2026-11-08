import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,mkdir,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';

test('published HTML has unchanged raw copies for the native integrity check',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'pigeon-design-publish-'));
 try{
  await mkdir(join(directory,'dist'));const html='<!doctype html><main>Post office</main>';
  for(const [name,text] of Object.entries({'index.html':html,'app.js':'window.pigeonAppReady=true;','styles.css':'main{color:green}'}))await writeFile(join(directory,'dist',name),text);
  execFileSync('node',[resolve('scripts/design-manifest.mjs')],{cwd:directory});
  const manifest=JSON.parse(await readFile(join(directory,'dist/design-update.json'),'utf8'));
  assert.deepEqual(Object.keys(manifest.files).sort(),['app.js','index.html','styles.css']);
  assert.equal(await readFile(join(directory,'dist/design-raw/index.html.txt'),'utf8'),html);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('native design releases stay coherent and work offline; invalid updates cannot replace them',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'pigeon-java-'));
 try{
  execFileSync('java',['-m','jdk.compiler/com.sun.tools.javac.Main','-d',directory,'android/src/uk/co/pigeonpost/mail/DesignBundle.java','tests/native/DesignBundleTest.java']);
  execFileSync('java',['-cp',directory,'uk.co.pigeonpost.mail.DesignBundleTest']);
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('automatic reload waits for editing, dialogs and design review to finish',async()=>{
 const source=await readFile('app.js','utf8');
 const guard=source.slice(source.indexOf('window.pigeonPrepareDesignReload='),source.indexOf('window.pigeonAppReady=true'));
 let blocked=false,review=false;
 const saved=new Map(),document={hidden:false,body:{inert:false},querySelector:selector=>selector.startsWith('[data-review-ui')?{shadowRoot:{querySelector:()=>review?{}:null}}:blocked?{}:null};
 const context={window:{},document,flow:null,tab:'inbox',sessionStorage:{setItem:(k,v)=>saved.set(k,v)}};
 vm.runInNewContext(guard,context);
 for(const condition of ['hidden','flow','editor','review']){
  document.hidden=condition==='hidden';context.flow=condition==='flow'?{}:null;blocked=condition==='editor';review=condition==='review';
  assert.equal(context.window.pigeonPrepareDesignReload(),false,condition);assert.equal(document.body.inert,false);
 }
 document.hidden=false;context.flow=null;blocked=false;review=false;
 assert.equal(context.window.pigeonPrepareDesignReload(),true);assert.equal(document.body.inert,true);assert.equal(saved.get('pigeon.design.return-tab'),'inbox');
});
