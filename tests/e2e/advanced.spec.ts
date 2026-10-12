import { test, expect } from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {readPsd} from 'ag-psd';
import UTIF from 'utif';
async function alpha(page:import('@playwright/test').Page,x:number,y:number) {return page.getByLabel('Editing canvas').evaluate((node,p)=>{const c=node as HTMLCanvasElement;return c.getContext('2d')!.getImageData(Math.floor(p[0]*c.width),Math.floor(p[1]*c.height),1,1).data[3];},[x,y]);}
async function fixture(page:import('@playwright/test').Page) {
 await page.goto('/editor/');await expect(page.getByRole('button',{name:'Choose an image',exact:true})).toBeVisible();
 const data=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=200;c.height=120;const x=c.getContext('2d')!;x.fillStyle='red';x.fillRect(0,0,200,120);x.fillStyle='blue';x.fillRect(70,30,60,60);return c.toDataURL().split(',')[1];});
 await page.locator('input[type=file]').first().setInputFiles({name:'colors.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});await page.getByRole('button',{name:'Keep original',exact:true}).click();
 await expect.poll(()=>alpha(page,.1,.1)).toBe(255);
}
test('lasso and color wand edit non-destructive masks, retain undo and save',async({page})=>{
 await fixture(page);
 await page.getByRole('button',{name:'Freehand lasso',exact:true}).click();
 const box=(await page.getByLabel('Editing canvas').boundingBox())!;
 const points=[[.1,.1],[.45,.1],[.1,.6]];
 await page.mouse.move(box.x+points[0][0]*box.width,box.y+points[0][1]*box.height);await page.mouse.down();
 for(const p of points.slice(1)) await page.mouse.move(box.x+p[0]*box.width,box.y+p[1]*box.height,{steps:5});await page.mouse.up();
 await expect(page.getByLabel('Selected image pixels')).toBeVisible();await page.getByRole('button',{name:'Erase selected area',exact:true}).click();
 await expect.poll(()=>alpha(page,.15,.2)).toBe(0);expect(await alpha(page,.5,.5)).toBe(255);
 await page.getByRole('button',{name:'Undo',exact:true}).click();await expect.poll(()=>alpha(page,.15,.2)).toBe(255);
 await page.getByRole('button',{name:'Magic wand',exact:true}).click();await page.mouse.click(box.x+.5*box.width,box.y+.5*box.height);
 await expect(page.getByRole('button',{name:'Erase selected area',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Erase selected area',exact:true}).click();
 await expect.poll(()=>alpha(page,.5,.5)).toBe(0);expect(await alpha(page,.1,.1)).toBe(255);
 await page.getByRole('button',{name:'Restore selected area',exact:true}).click();await expect.poll(()=>alpha(page,.5,.5)).toBe(255);
 await page.getByRole('button',{name:'Keep only selected area',exact:true}).click();await expect.poll(()=>alpha(page,.1,.1)).toBe(0);
 await page.waitForTimeout(900);await page.reload();await expect.poll(()=>alpha(page,.5,.5)).toBe(255);expect(await alpha(page,.1,.1)).toBe(0);
});
test('native layered PSD and vector SVG retain editable document structure, PDF pages import',async({page})=>{ test.setTimeout(45000);
 await fixture(page);await page.getByRole('button',{name:'Layer',exact:true}).click();await page.getByRole('button',{name:'Rectangle',exact:true}).click();
 await page.getByLabel('Layer width',{exact:true}).fill('30');await page.getByLabel('Layer height',{exact:true}).fill('30');
 await page.getByRole('button',{name:'Text',exact:true}).click();
 await page.getByRole('button',{name:'Draw vector path · P',exact:true}).click();
 const box=(await page.getByLabel('Editing canvas').boundingBox())!, x=box.x+box.width*.35,y=box.y+box.height*.35;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+90,y+5,{steps:4});await page.mouse.move(x+45,y+75,{steps:4});await page.mouse.up();
 await page.getByRole('button',{name:'Adjust',exact:true}).click();await expect(page.getByRole('heading',{name:'Path nodes'})).toBeVisible();
 const node=page.getByLabel('Node 1 X');await node.fill(String(Math.min(.95,Number(await node.inputValue())+.04)));
 for(const [mime,ext] of [['image/vnd.adobe.photoshop','psd'],['image/svg+xml','svg'],['application/pdf','pdf']]) {
  await page.getByRole('button',{name:'Export',exact:true}).click();await expect(page.getByRole('dialog',{name:'Export image'})).toBeVisible();await page.getByRole('combobox',{name:'Format'}).selectOption(mime);
  const [d]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export this artboard',exact:true}).click()]);const bytes=await readFile((await d.path())!);
  if(ext==='psd'){const psd=readPsd(bytes,{skipCompositeImageData:true,skipLayerImageData:true,skipThumbnail:true});expect(psd.children).toHaveLength(4);expect(psd.children!.some(l=>!!l.text)).toBe(true);}
  if(ext==='svg'){expect(bytes.toString()).toContain('<rect');expect(bytes.toString()).toContain('<text');expect(bytes.toString()).toContain('<path');}
  await page.locator('input[type=file]').first().setInputFiles({name:`editable.${ext}`,mimeType:mime,buffer:bytes});
  await expect.poll(()=>alpha(page,.1,.1)).toBe(255);
  if(ext!=='pdf') {await page.getByRole('button',{name:'Layer',exact:true}).click();}
 }
});
test('HEIF and RAW decode locally; ICC soft proof and real CMYK TIFF export/import',async({page})=>{test.setTimeout(240000);
 await page.goto('/editor/');await expect(page.getByRole('button',{name:'Choose an image',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>crossOriginIsolated)).toBe(true);
 const heic=await readFile('tests/fixtures/coffee.heic');
 const probe=await page.evaluate(async({bytes})=>new Promise(resolve=>{const src="importScripts('http://localhost:3000/codecs/heif.js');onmessage=e=>{try{const lib=globalThis.__uncanvaHeif();const imgs=new lib.HeifDecoder().decode(new Uint8Array(e.data));const im=imgs[0];const pixels=new ImageData(im.get_width(),im.get_height());im.display(pixels,out=>postMessage({decoder:typeof lib.HeifDecoder,count:imgs.length,size:[im.get_width(),im.get_height()],display:!!out}))}catch(e){postMessage({error:String(e),stack:e.stack})}}";const url=URL.createObjectURL(new Blob([src],{type:'text/javascript'}));const w=new Worker(url);w.onmessage=e=>{resolve(e.data);w.terminate();URL.revokeObjectURL(url)};w.onerror=e=>resolve({message:e.message,filename:e.filename,lineno:e.lineno});w.postMessage(bytes)}),{bytes:Array.from(heic)});expect(probe).toMatchObject({decoder:'function',count:1,size:[600,400],display:true});
 for(const [path,name,mime,width] of [['tests/fixtures/coffee.heic','photo.heic','image/heic','600'],['tests/fixtures/sensor.dng','sensor.dng','image/x-adobe-dng','64']]) {
  await page.locator('input[type=file]').first().setInputFiles({name,mimeType:mime,buffer:await readFile(path)});
  await expect(page.getByRole('button',{name:'Keep original',exact:true})).toBeVisible({timeout:10000});await page.getByRole('button',{name:'Keep original',exact:true}).click();
  await expect.poll(()=>alpha(page,.5,.5)).toBe(255);
  if(name==='photo.heic'){await page.getByRole('button',{name:'Canvas',exact:true}).click();await expect(page.getByLabel('Artboard width',{exact:true})).toHaveValue(width);await page.getByRole('button',{name:'Add artboard',exact:true}).click();}
 }
 await page.getByRole('button',{name:'Adjust',exact:true}).click();await expect(page.getByRole('heading',{name:'Camera RAW development'})).toBeVisible();await expect(page.getByLabel('RAW white balance')).toBeVisible();
 await page.getByRole('button',{name:'Develop from original RAW'}).click();await expect(page.getByText(/Camera RAW redeveloped locally/)).toBeVisible({timeout:30000});await expect(page.locator('.save-status')).toContainText('Saved on this device',{timeout:10000});await page.reload();await expect(page.getByRole('button',{name:'sensor.dng',exact:true})).toBeVisible();await page.getByRole('button',{name:'sensor.dng',exact:true}).click();await page.getByRole('button',{name:'Adjust',exact:true}).click();await expect(page.getByRole('heading',{name:'Camera RAW development'})).toBeVisible();
 await page.getByText('Color management · ICC / CMYK',{exact:true}).click();
 await page.getByLabel('ICC profile',{exact:true}).setInputFiles('tests/fixtures/printer.icc');
 await page.getByRole('button',{name:'Preview CMYK soft proof',exact:true}).click();await expect(page.getByAltText('CMYK soft proof converted back to display sRGB')).toBeVisible();
 const [d]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export profiled CMYK TIFF',exact:true}).click()]);const bytes=await readFile((await d.path())!);const ifd=UTIF.decode(bytes)[0];expect(ifd.t262).toEqual([5]);expect(ifd.t277).toEqual([4]);expect(ifd.t34675).toHaveLength((await readFile('tests/fixtures/printer.icc')).length);
 await page.locator('input[type=file]').first().setInputFiles({name:'print.tiff',mimeType:'image/tiff',buffer:bytes});await expect(page.getByRole('button',{name:'Keep original',exact:true})).toBeVisible();
});
