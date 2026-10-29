(() => {
'use strict';
const $=id=>document.getElementById(id),dialog=$('previewDialog');
let abort=null,zoom=1,image=null,objectURL=null,opener=null;
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function setStatus(text){$('previewStatus').textContent=text;}
function clean(){
  abort?.abort();abort=null;$('previewBody').querySelectorAll('video,audio').forEach(m=>{m.pause();m.removeAttribute('src');m.load();});
  $('previewBody').replaceChildren();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;image=null;zoom=1;
}
function scale(){if(image)image.style.width=(zoom*100)+'%';$('previewZoomLabel').textContent=Math.round(zoom*100)+'%';}
function open(resource,url){
  if(dialog.open)dialog.close();clean();opener=document.activeElement;
  $('previewTitle').textContent=resource.title;
  $('previewMeta').textContent=[resource.school,resource.subject,resource.yearLevel?'Year '+resource.yearLevel:'',resource.extension].filter(Boolean).join(' · ');
  $('previewOpen').href=url;$('previewDownload').href=url;$('previewDownload').download=resource.filename||'';
  $('previewZoom').hidden=true;dialog.classList.remove('preview-expanded');
  $('previewFocus').setAttribute('aria-pressed','false');$('previewFocus').textContent='Full screen';
  const mode=SchoolPreviewModel.choose(resource,url,location.href),body=$('previewBody');
  body.dataset.kind=mode.kind;dialog.showModal();
  if(mode.kind==='frame'){
    const frame=document.createElement('iframe');frame.title='Preview: '+resource.title;
    frame.referrerPolicy='no-referrer';frame.allow='fullscreen';frame.setAttribute('allowfullscreen','');
    frame.onload=()=>{if(dialog.open)setStatus(mode.provider==='Google Drive'?'Google Drive preview · Access follows the original sharing settings.':mode.provider==='Microsoft Office'?'Word / Office preview · Use the document controls to browse pages.':'PDF preview · Use the document toolbar to navigate and zoom.');};
    body.append(frame);setStatus('Loading preview… If it stays blank, use Open original.');frame.src=mode.src;
  }else if(mode.kind==='image'){
    image=document.createElement('img');const current=image;current.alt=resource.title;current.className='preview-image';current.onload=()=>{if(current===image)setStatus('Image preview · Use the zoom controls to inspect details.');};
    current.onerror=()=>{if(current===image){setStatus('The image could not load. Use Open original to check the file.');current.remove();}};
    body.append(current);$('previewZoom').hidden=false;scale();setStatus('Loading image…');current.src=mode.src;
  }else if(mode.kind==='text'){
    abort=new AbortController();const controller=abort;
    setStatus('Loading text preview…');
    (async()=>{try{
      const r=await fetch(mode.src,{signal:controller.signal});if(!r.ok)throw Error();
      const reader=r.body.getReader(),decoder=new TextDecoder();let content='',received=0,truncated=false;
      try{while(true){const {done,value}=await reader.read();if(done)break;const left=200000-received;content+=decoder.decode(value.subarray(0,Math.max(left,0)),{stream:true});received+=value.length;if(received>=200000){truncated=true;await reader.cancel();break;}}content+=decoder.decode();}finally{reader.releaseLock();}
      if(controller.signal.aborted)return;body.replaceChildren(node('pre','preview-text',content));setStatus(truncated?'Showing the first 200 KB. Download the original for the complete file.':'Text preview · Content is shown as plain text.');
    }catch(e){if(!controller.signal.aborted)setStatus('The text could not load. Use Open original to view the file.');}})();
  }else if(['audio','video'].includes(mode.kind)){
    const media=document.createElement(mode.kind);media.controls=true;media.preload='metadata';media.src=mode.src;
    media.onerror=()=>setStatus('This browser could not play the file. Use Open original.');body.append(media);setStatus('Media preview · Playback controls are below.');
  }else{
    const box=node('div','preview-unavailable');box.append(node('span','preview-fallback-icon','▥'),node('h3','','Preview isn’t available for this file'),node('p','','Use Open original or Download file. Word, PowerPoint and other Office files can be previewed here when they are linked from Google Drive.'));
    body.append(box);setStatus('Original file available through the buttons above.');
  }
}
$('previewClose').onclick=()=>dialog.close();
$('previewFocus').onclick=async()=>{
  if(document.fullscreenElement===dialog){await document.exitFullscreen();return;}
  if(dialog.classList.contains('preview-expanded')){dialog.classList.remove('preview-expanded');$('previewFocus').textContent='Full screen';$('previewFocus').setAttribute('aria-pressed','false');return;}
  dialog.classList.add('preview-expanded');$('previewFocus').textContent='Exit full screen';$('previewFocus').setAttribute('aria-pressed','true');
  try{if(dialog.requestFullscreen)await dialog.requestFullscreen();}catch{/* Expanded dialog is the fallback when native full screen is unavailable. */}
};
document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement!==dialog){dialog.classList.remove('preview-expanded');$('previewFocus').textContent='Full screen';$('previewFocus').setAttribute('aria-pressed','false');}});
$('previewZoomIn').onclick=()=>{zoom=Math.min(4,zoom+.25);scale();};
$('previewZoomOut').onclick=()=>{zoom=Math.max(.25,zoom-.25);scale();};
$('previewZoomReset').onclick=()=>{zoom=1;scale();};
dialog.addEventListener('close',()=>{if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});clean();if(opener?.isConnected&&opener.getClientRects().length)opener.focus();});
window.SchoolResourcePreview={open};
})();
