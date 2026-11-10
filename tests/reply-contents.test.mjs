import test from 'node:test';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';import {execFileSync} from 'node:child_process';
test('native replies distinguish absent JSON values from a deliberately typed null note',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'pigeon-replies-'));
 try{
  execFileSync('java',['-m','jdk.compiler/com.sun.tools.javac.Main','-d',directory,'android/src/uk/co/pigeonpost/mail/ReplyContents.java','tests/native/ReplyContentsTest.java']);
  execFileSync('java',['-cp',directory,'uk.co.pigeonpost.mail.ReplyContentsTest']);
 }finally{await rm(directory,{recursive:true,force:true});}
});
