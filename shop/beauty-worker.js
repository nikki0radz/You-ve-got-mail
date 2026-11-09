// Dedicated classic worker: inference and pixel processing stay off the UI thread.
let detector,renderNaturalBeauty,initializing;
const buffers={};
function canvas(name,w,h){let c=buffers[name];if(!c)c=buffers[name]=new OffscreenCanvas(w,h);if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;return c;}
async function initialize(){
 const base=new URL('./beauty-vendor/',self.location.href);
 const [{FaceLandmarker},pixels,...parts]=await Promise.all([
  import(new URL('vision_bundle.mjs',base).href),import(new URL('./beauty-render.mjs',self.location.href).href),
  ...['runtime-1.txt','runtime-2.txt','face-landmarker.txt'].map(async path=>{const response=await fetch(new URL(path,base));if(!response.ok)throw Error('Filter assets unavailable');return new Uint8Array(await response.arrayBuffer());})
 ]);
 const binary=new Uint8Array(parts[0].length+parts[1].length);binary.set(parts[0]);binary.set(parts[1],parts[0].length);
 const inferenceCanvas=new OffscreenCanvas(1,1),engine={wasmBinary:binary,canvas:inferenceCanvas};self.Module=engine;
 detector=await FaceLandmarker.createFromOptions({wasmLoaderPath:new URL('vision_wasm_internal.js',base).href,wasmBinaryPath:new URL('runtime-1.txt',base).href},{baseOptions:{modelAssetBuffer:parts[2],delegate:'GPU'},canvas:inferenceCanvas,runningMode:'VIDEO',numFaces:1,minFaceDetectionConfidence:.6,minFacePresenceConfidence:.6,minTrackingConfidence:.6,outputFaceBlendshapes:false,outputFacialTransformationMatrixes:false});
 renderNaturalBeauty=pixels.renderNaturalBeauty;
}
function process(bitmap){
 const w=bitmap.width,h=bitmap.height,output=canvas('out',w,h),ctx=output.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,w,h);ctx.drawImage(bitmap,0,0);bitmap.close();
 const scale=Math.min(1,320/Math.max(w,h)),sample=canvas('sample',Math.max(1,Math.round(w*scale)),Math.max(1,Math.round(h*scale)));sample.getContext('2d').drawImage(output,0,0,sample.width,sample.height);
 const result=detector.detectForVideo(sample,performance.now()),faces=result.faceLandmarks;
 if(!faces.length)return {bitmap:output.transferToImageBitmap(),faces:0};
 renderNaturalBeauty(output,faces,buffers);
 return {bitmap:output.transferToImageBitmap(),faces:faces.length};
}
self.onmessage=async({data})=>{
 try{
  if(data.type==='init'){initializing=initialize();await initializing;self.postMessage({type:'ready'});return;}
  if(data.type==='frame'){await initializing;const result=process(data.bitmap);self.postMessage({type:'result',id:data.id,...result},[result.bitmap]);}
 }catch(error){data.bitmap?.close();self.postMessage({type:'error',id:data.id,message:error?.stack||error?.message||'Filter unavailable'});}
};
