// Pin the on-device face-landmark runtime; no camera images leave the device.
// Run once before building a clean checkout. npm only downloads the SDK archive.
import {mkdtemp,readFile,writeFile,mkdir,rm,copyFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=new URL('../shop/beauty-vendor/',import.meta.url);
const temp=await mkdtemp(join(tmpdir(),'mail-beauty-'));
try{
 execFileSync('npm',['pack','@mediapipe/tasks-vision@0.10.21','--pack-destination',temp],{stdio:'pipe'});
 execFileSync('tar',['-xzf',join(temp,'mediapipe-tasks-vision-0.10.21.tgz'),'-C',temp]);
 await mkdir(root,{recursive:true});
 await copyFile(join(temp,'package/vision_bundle.mjs'),new URL('vision_bundle.mjs',root));
 await copyFile(join(temp,'package/wasm/vision_wasm_internal.js'),new URL('vision_wasm_internal.js',root));
 const wasm=await readFile(join(temp,'package/wasm/vision_wasm_internal.wasm'));
 // The existing Android design updater has an 8 MiB per-file limit.
 await writeFile(new URL('runtime-1.txt',root),wasm.subarray(0,5*1024*1024));
 await writeFile(new URL('runtime-2.txt',root),wasm.subarray(5*1024*1024));
 const response=await fetch('https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task');
 if(!response.ok)throw Error('Could not download the face landmark model');
 const model=new Uint8Array(await response.arrayBuffer());
 if(createHash('sha256').update(model).digest('hex')!=='64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff')throw Error('Unexpected face model checksum');
 await writeFile(new URL('face-landmarker.txt',root),model);
 const license=await fetch('https://raw.githubusercontent.com/google-ai-edge/mediapipe/master/LICENSE');
 if(!license.ok)throw Error('Could not retrieve the MediaPipe license');
 await writeFile(new URL('LICENSE.txt',root),await license.text());
 await writeFile(new URL('NOTICE.txt',root),'MediaPipe Tasks Vision 0.10.21 and Face Landmarker float16/1. Copyright Google LLC. Apache License 2.0. Model: https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task\nBinary assets use .txt containers for compatibility with the existing signed Android design updater; bytes are unchanged.\n');
 console.log('Prepared pinned on-device beauty assets');
}finally{await rm(temp,{recursive:true,force:true});}
