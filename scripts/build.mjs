import{mkdir,cp,rm}from'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const path of['index.html','styles.css','app.js','domain.mjs','assets','shop'])await cp(path,`dist/${path}`,{recursive:true});
console.log('Static draft ready in dist/.');
