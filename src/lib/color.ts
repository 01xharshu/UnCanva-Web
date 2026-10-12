export { encodeCMYKTIFF } from "./cmyk-tiff";
export async function colorJob(request:Record<string,unknown>) {
  const worker=new Worker(new URL('./color.worker.ts',import.meta.url));
  return new Promise<{blob:Blob;data:ArrayBuffer}>((resolve,reject)=>{
    const timer=setTimeout(()=>{worker.terminate();reject(new Error('Color conversion timed out'));},120000);
    worker.onmessage=e=>{clearTimeout(timer);worker.terminate();if(e.data.error) reject(new Error(e.data.error)); else resolve(e.data);};
    worker.onerror=e=>{clearTimeout(timer);worker.terminate();reject(new Error(e.message));};
    worker.postMessage(request);
  });
}
export async function fileDataURL(file:Blob) {return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(r.error);r.readAsDataURL(file);});}
