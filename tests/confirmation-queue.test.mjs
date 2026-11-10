import test from 'node:test';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
test('phone delivery confirmations survive failed sends and storage failures without starving newer mail',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'pigeon-confirmations-'));
 try{execFileSync('java',['-m','jdk.compiler/com.sun.tools.javac.Main','-d',directory,'android/src/uk/co/pigeonpost/mail/ConfirmationQueue.java','tests/native/ConfirmationQueueTest.java']);execFileSync('java',['-cp',directory,'uk.co.pigeonpost.mail.ConfirmationQueueTest']);}
 finally{await rm(directory,{recursive:true,force:true});}
});
