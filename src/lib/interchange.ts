import { Artboard, Project, newBoard, newLayer, uid, validateProject, dimensions } from './document';
import { backup, putAsset, restoreBackup } from './storage';
import { renderBoard, imageLayer } from './render';
import { job } from './codec-client';
const escapeXML = (s: string) => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
async function metadata(b: Artboard) {
  const p: Project = {version:1,id:uid(),name:b.name,active:b.id,artboards:[b]};
  const bytes = new Uint8Array(await (await backup(p)).arrayBuffer());
  let value = ''; for(let i=0;i<bytes.length;i+=8192) value += String.fromCharCode(...bytes.subarray(i,i+8192));
  if (value.length > 100_000_000) throw new Error('Editable interchange data exceeds 100 MB. Export a project backup instead.');
  return btoa(value);
}
async function restoreMetadata(encoded: string) {
  if (encoded.length > 140_000_000) throw new Error('Embedded document exceeds 100 MB');
  const bytes = Uint8Array.from(atob(encoded), c=>c.charCodeAt(0));
  const embedded = JSON.parse(new TextDecoder().decode(bytes));
  validateProject(embedded.project);
  const assets: Record<string,string> = {};
  const ids = new Map<string,string>();
  for(const board of embedded.project.artboards) for(const layer of board.layers) for(const key of ['asset','mask','rawSource']) if(layer[key]) { const old=layer[key]; if(!ids.has(old)) {const id=uid();ids.set(old,id);assets[id]=embedded.assets[old];} layer[key]=ids.get(old); }
  embedded.assets=assets;
  const project = await restoreBackup(new File([JSON.stringify(embedded)], 'embedded.uncanva'));
  // Import as independent document, never overwrite asset references of an existing project.
  const board = project.artboards[0]; board.id = uid(); board.layers.forEach(l => l.id = uid());
  return board;
}
export async function exportSVG(b: Artboard, width: number, height: number) {
  dimensions(width,height);
  const nodes: string[] = [];
  if(b.background !== 'transparent') nodes.push(`<rect width="${b.width}" height="${b.height}" fill="${b.background}"/>`);
  for(const l of b.layers) {
    const transform = `translate(${l.x+l.width/2} ${l.y+l.height/2}) rotate(${l.rotation}) translate(${-l.width/2} ${-l.height/2})`;
    let content = '';
    if(l.type==='rect') content = `<rect width="${l.width}" height="${l.height}" fill="${l.color}"/>`;
    else if(l.type==='ellipse') content = `<ellipse cx="${l.width/2}" cy="${l.height/2}" rx="${l.width/2}" ry="${l.height/2}" fill="${l.color}"/>`;
    else if(l.type==='path') content = `<path d="${escapeXML(l.pathData || '')}" transform="scale(${l.width/(l.pathBox?.[0]||1)} ${l.height/(l.pathBox?.[1]||1)})" fill="${l.color}"/>`;
    else if(l.type==='text') content = `<text font-family="Arial" font-weight="600" font-size="${l.fontSize}" fill="${l.color}">${l.text.split('\n').map((t,i)=>`<tspan x="0" y="${l.fontSize + i*l.fontSize*1.2}">${escapeXML(t)}</tspan>`).join('')}</text>`;
    else { const c = await imageLayer(l); content = `<image width="${l.width}" height="${l.height}" href="${c.toDataURL('image/png')}"/>`; }
    nodes.push(`<g data-layer-name="${escapeXML(l.name)}" transform="${transform}" opacity="${l.opacity}"${l.visible?'':' display="none"'}>${content}</g>`);
  }
  const encoded = await metadata(b);
  return new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${b.width} ${b.height}"><metadata id="uncanva-document">${encoded}</metadata>${nodes.join('')}</svg>`],{type:'image/svg+xml'});
}
export async function exportPSD(b: Artboard, width: number, height: number) {
  // Native PSD layers have their own raster data. Own-document XMP retains reversible source/masks/vector paths.
  dimensions(width,height);
  const sx = width/b.width, sy = height/b.height;
  const children: Record<string,unknown>[]=[];
  const sources = b.background === 'transparent' ? b.layers : [{...newLayer('rect'), name:'Artboard background', x:0,y:0,width:b.width,height:b.height,color:b.background},...b.layers];
  for(const l of sources) {
    const c = await renderBoard({...b,background:'transparent',layers:[{...l,visible:true,opacity:1}]},width,height);
    const pixels = c.getContext('2d')!.getImageData(0,0,width,height);
    let left=width,top=height,right=0,bottom=0;
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) if(pixels.data[(y*width+x)*4+3]) { left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1); }
    if(right<=left || bottom<=top) { left=top=0;right=bottom=1; }
    const cropped=c.getContext('2d')!.getImageData(left,top,right-left,bottom-top);
    const child: Record<string,unknown>={name:l.name,left,top,opacity:l.opacity,hidden:!l.visible,protected:{composite:l.locked},imageData:{width:cropped.width,height:cropped.height,data:cropped.data}};
    if(l.type==='text') {
      const angle=l.rotation*Math.PI/180, cos=Math.cos(angle),sin=Math.sin(angle);
      const x=l.x+l.width/2-cos*l.width/2+sin*l.height/2, y=l.y+l.height/2-sin*l.width/2-cos*l.height/2;
      child.text={text:l.text,transform:[sx*cos,sy*sin,-sx*sin,sy*cos,x*sx,(y+l.fontSize)*sy],style:{font:{name:'Arial-BoldMT'},fontSize:l.fontSize,fillColor:{r:parseInt(l.color.slice(1,3),16),g:parseInt(l.color.slice(3,5),16),b:parseInt(l.color.slice(5,7),16)}}};
    }
    children.push(child);
  }
  const composite=await renderBoard(b,width,height);
  const imageData=composite.getContext('2d')!.getImageData(0,0,width,height);
  const encoded=await metadata(b);
  const result=await job<{data:ArrayBuffer}>({kind:'psd-write',width,height,children,imageData:{width,height,data:imageData.data},xmp:`<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:uc="https://uncanva.local/document" uc:document="${encoded}"/></rdf:RDF></x:xmpmeta>`});
  return new Blob([result.data],{type:'image/vnd.adobe.photoshop'});
}
export async function importPSD(file: File) {
  const data=await file.arrayBuffer();
  const parsed=await job<{xmp?:string;width:number;height:number;layers:{name:string;left:number;top:number;width:number;height:number;opacity:number;visible:boolean;locked:boolean;blob:Blob}[];warning?:string}>({kind:'psd-read',data},[data]);
  const embedded=parsed.xmp?.match(/uc:document="([A-Za-z0-9+/=]+)"/);
  if(embedded) return {board:await restoreMetadata(embedded[1]),warning:''};
  const b=newBoard();b.name=file.name;b.width=parsed.width;b.height=parsed.height;
  for(const source of parsed.layers) { const l=newLayer('image'); Object.assign(l,{name:source.name,x:source.left,y:source.top,width:source.width,height:source.height,opacity:source.opacity,visible:source.visible,locked:source.locked});l.asset=uid();await putAsset(l.asset,source.blob);b.layers.push(l); }
  if(!b.layers.length) throw new Error('PSD has no supported pixel layers');
  return {board:b,warning:parsed.warning};
}
export async function importEditableSVG(file: File): Promise<Artboard | null> {
  const doc = new DOMParser().parseFromString(await file.text(),'image/svg+xml');
  if(doc.querySelector('parsererror')) throw new Error('Invalid SVG');
  const own=doc.querySelector('metadata#uncanva-document')?.textContent;
  if(own) return restoreMetadata(own.trim());
  // Safe simple SVG subset. Complex effects/transforms fall back to sanitized raster import.
  if(doc.querySelector('filter,mask,clipPath,use,linearGradient,radialGradient,image,script,foreignObject') || doc.querySelector('[transform]')) return null;
  const root=doc.documentElement, vb=root.getAttribute('viewBox')?.trim().split(/[ ,]+/).map(Number);
  const b=newBoard();b.name=file.name;b.width=Number(root.getAttribute('width')?.replace(/px$/,''))||vb?.[2]||300;b.height=Number(root.getAttribute('height')?.replace(/px$/,''))||vb?.[3]||150;dimensions(b.width,b.height);
  const n=(el:Element,key:string,fallback=0)=>Number(el.getAttribute(key))||fallback;
  for(const el of doc.querySelectorAll('rect,ellipse,circle,path,text,polygon,polyline')) {
    if(el.getAttribute('stroke') && el.getAttribute('stroke')!=='none') return null;
    const fill=el.getAttribute('fill')||el.parentElement?.getAttribute('fill')||'#000000';
    if(!/^#[\da-f]{6}$/i.test(fill) && !/^#[\da-f]{3}$/i.test(fill)) return null;
    const l=newLayer(el.tagName==='text'?'text':el.tagName==='rect'?'rect':['ellipse','circle'].includes(el.tagName)?'ellipse':'path');
    l.color=fill.length===4?'#'+fill.slice(1).split('').map(x=>x+x).join(''):fill;l.name=el.getAttribute('id')||el.tagName;l.opacity=n(el,'opacity',1);l.x=n(el,'x')-(vb?.[0]||0);l.y=n(el,'y')-(vb?.[1]||0);
    if(l.type==='rect') { l.width=n(el,'width');l.height=n(el,'height'); }
    if(l.type==='ellipse') { const rx=n(el,'rx',n(el,'r')),ry=n(el,'ry',n(el,'r'));l.width=rx*2;l.height=ry*2;l.x=n(el,'cx')-rx;l.y=n(el,'cy')-ry; }
    if(l.type==='text') {l.text=el.textContent||'';l.fontSize=n(el,'font-size',16);l.y-=l.fontSize;l.width=b.width;l.height=l.fontSize*1.2;}
    if(l.type==='path') { l.x=-(vb?.[0]||0);l.y=-(vb?.[1]||0);l.width=b.width;l.height=b.height;l.pathBox=[b.width,b.height];l.pathData=el.getAttribute('d')||'M '+(el.getAttribute('points')||'')+' Z'; }
    b.layers.push(l);
  }
  if(!b.layers.length) return null;
  // Apply normal project validation to every imported layer.
  validateProject({version:1,id:uid(),name:b.name,active:b.id,artboards:[b]});
  return b;
}
