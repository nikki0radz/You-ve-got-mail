import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
test('queued popups survive slow unlocks, relocking, DND, overlay failures and service restarts',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'pigeon-unlock-'));
 try{
  execFileSync('java',['-m','jdk.compiler/com.sun.tools.javac.Main','-d',directory,'android/src/uk/co/pigeonpost/mail/UnlockDelivery.java','tests/native/UnlockDeliveryTest.java']);
  execFileSync('java',['-cp',directory,'uk.co.pigeonpost.mail.UnlockDeliveryTest'],{stdio:'inherit'});
 }finally{await rm(directory,{recursive:true,force:true});}
});
