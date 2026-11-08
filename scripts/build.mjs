import{mkdir,cp,rm}from'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
for(const path of['index.html','guest.html','styles.css','app.js','domain.mjs','assets','shop','post','design'])await cp(path,`dist/${path}`,{recursive:true});
await import('./design-manifest.mjs');
console.log('Static draft ready in dist/.');
