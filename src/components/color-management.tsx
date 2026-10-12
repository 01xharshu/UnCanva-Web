'use client';
import {useState} from 'react';
import {Artboard, Layer, uid} from '@/lib/document';
import {colorJob,fileDataURL} from '@/lib/color';
import {renderBoard,original,download} from '@/lib/render';
import {putAsset} from '@/lib/storage';
export default function ColorManagement({board,layer,updateBoard,updateLayer,setMessage}:{board:Artboard;layer?:Layer;updateBoard:(p:Partial<Artboard>)=>void;updateLayer:(p:Partial<Layer>)=>void;setMessage:(s:string)=>void}) {
  const [busy,setBusy]=useState(false),[proof,setProof]=useState(''),[intent,setIntent]=useState(1);
  async function run(kind:'proof'|'print'|'interpret') {
    if(!board.colorProfile || busy) return;
    setBusy(true);
    try {
      const profile=await (await fetch(board.colorProfile)).arrayBuffer();
      let c:HTMLCanvasElement;
      if(kind==='interpret') {
        if(!layer?.asset || layer.locked) throw new Error('Select an unlocked image layer');
        const image=await original(layer.asset);c=document.createElement('canvas');c.width=image.width;c.height=image.height;c.getContext('2d')!.drawImage(image,0,0);
      } else c=await renderBoard(board,kind==='proof'?Math.round(board.width*Math.min(1,1200/Math.max(board.width,board.height))):board.width,kind==='proof'?Math.round(board.height*Math.min(1,1200/Math.max(board.width,board.height))):board.height);
      const cx=c.getContext('2d')!;
      if(kind==='print') {cx.globalCompositeOperation='destination-over';cx.fillStyle='white';cx.fillRect(0,0,c.width,c.height);}
      const pixels=cx.getImageData(0,0,c.width,c.height);
      const result=await colorJob({kind,width:c.width,height:c.height,data:pixels.data.buffer,profile,intent});
      if(kind==='print') download(new Blob([result.data],{type:'image/tiff'}),`${board.name}-CMYK.tif`);
      else if(kind==='proof') setProof(await fileDataURL(result.blob));
      else {const id=uid();await putAsset(id,result.blob);updateLayer({asset:id});setMessage('ICC interpretation applied to a new image asset. Undo restores the previous original.');}
    } catch(error){setMessage(String(error));}finally{setBusy(false);}
  }
  return <details className="subject-controls"><summary>Color management · ICC / CMYK</summary>
    <p className="helper">Editing uses sRGB. Load your RGB source or CMYK printer profile locally. Print TIFF embeds the CMYK profile and flattens transparency onto white.</p>
    <label>ICC profile<input aria-label="ICC profile" type="file" accept=".icc,.icm" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>4_000_000){setMessage('ICC profiles must be below 4 MB');return;}updateBoard({colorProfile:await fileDataURL(f),colorProfileName:f.name});setProof('');}} /></label>
    {board.colorProfile && <><p>{board.colorProfileName}</p><label>Rendering intent<select aria-label="ICC rendering intent" value={intent} onChange={e=>setIntent(+e.target.value)}><option value={0}>Perceptual</option><option value={1}>Relative colorimetric</option><option value={2}>Saturation</option><option value={3}>Absolute colorimetric</option></select></label>
    <button className="button" disabled={busy} onClick={()=>void run('proof')}>Preview CMYK soft proof</button>
    <button className="button" disabled={busy} onClick={()=>void run('print')}>Export profiled CMYK TIFF</button>
    <button className="button" disabled={busy||!layer?.asset||layer.locked} onClick={()=>void run('interpret')}>Reinterpret RGB source with ICC</button>
    <p className="helper">Reinterpret only untagged RGB pixels whose source profile is known. Browsers already convert tagged images to sRGB; applying their profile again changes colors incorrectly.</p>
    {busy&&<p role="status">Converting colors locally…</p>}
    {proof&&<img src={proof} alt="CMYK soft proof converted back to display sRGB" style={{width:'100%'}} />}
    </>}
  </details>;
}
