import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const files={};
async function walk(directory,prefix=''){
 for(const entry of (await readdir(directory,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
  const path=prefix+entry.name;
  if(entry.isDirectory())await walk(join(directory,entry.name),path+'/');
  else if(path!=='design-update.json'){
   if(!/^[A-Za-z0-9_-][A-Za-z0-9_./-]*\.(html|js|mjs|css|json|png|svg|webp|woff|woff2|txt)$/.test(path)||path.includes('..'))throw Error('Unsupported design asset: '+path);
   const bytes=await readFile(join(directory,entry.name));files[path]={sha256:hash(bytes),size:bytes.length};
  }
 }
}
await walk('dist');
const release={schema:1,bridge:1,revision:hash(JSON.stringify(files)),files};
await writeFile('dist/design-update.json',JSON.stringify(release)+'\n');
console.log('Design release '+release.revision.slice(0,12)+' · '+Object.keys(files).length+' verified assets');
