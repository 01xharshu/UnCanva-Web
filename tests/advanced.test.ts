import {describe,it,expect} from 'vitest';
import {floodSelection,polygonBounds} from '../src/lib/selection';
import {encodeCMYKTIFF} from '../src/lib/color';
import {newProject,newLayer,validateProject} from '../src/lib/document';
import * as UTIF from 'utif';
describe('advanced selections',()=>{
 it('wand respects connected components, global mode, tolerance and alpha',()=>{
  const data=new Uint8ClampedArray([255,0,0,255, 0,0,0,255, 250,0,0,255, 255,0,0,0]);
  const connected=floodSelection(data,4,1,0,0,8);expect([...connected].filter((_,i)=>i%4===3)).toEqual([255,0,0,0]);
  const global=floodSelection(data,4,1,0,0,8,false);expect([...global].filter((_,i)=>i%4===3)).toEqual([255,0,255,0]);
  expect(()=>floodSelection(data,4,1,-1,0,8)).toThrow();
 });
 it('lasso bounds retain layer-local normalized coordinates',()=>expect(polygonBounds([[.2,.4],[.8,.1],[.4,.9]])).toEqual({x:.2,y:.1,width:.6000000000000001,height:.8}));
});
describe('editable document and print TIFF',()=>{
 it('round-trips true CMYK samples and ICC bytes through an independent TIFF decoder',()=>{
  const profile=new Uint8Array(128);profile.set([97,99,115,112],36);
  const samples=new Uint8Array([12,34,56,78, 90,12,34,56]);
  const bytes=encodeCMYKTIFF(2,1,samples,profile),images=UTIF.decode(bytes);UTIF.decodeImage(bytes,images[0]);
  expect(images[0].t262).toEqual([5]);expect(images[0].t277).toEqual([4]);expect([...images[0].data]).toEqual([...samples]);
  expect(images[0].t34675).toHaveLength(128);
 });
 it('accepts editable paths and rejects invalid node/profile payloads',()=>{
  const p=newProject(),l=newLayer('path');l.pathData='M 0 0 L 1 0 L 1 1 Z';l.pathPoints=[[0,0],[1,0],[1,1]];p.artboards[0].layers.push(l);
  expect(validateProject(p).artboards[0].layers[0].type).toBe('path');
  const raw=newLayer('image');raw.asset='preview';raw.rawSource='raw-source';raw.rawSourceName='camera.dng';raw.rawOptions={halfSize:true,whiteBalance:'camera',exposure:0,denoise:0};p.artboards[0].layers.push(raw);expect(validateProject(p).artboards[0].layers[1].rawSource).toBe('raw-source');l.pathPoints=[[2,0]];expect(()=>validateProject(p)).toThrow();l.pathPoints=undefined;l.pathData='<script>';expect(()=>validateProject(p)).toThrow();
 });
});
