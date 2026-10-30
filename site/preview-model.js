(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.SchoolPreviewModel=factory();})(typeof window==='undefined'?globalThis:window,()=>{
'use strict';
function choose(resource,url,base){
  let u;try{u=new URL(url,base);}catch{return {kind:'unsupported'};}
  const origin=new URL(base).origin;
  if(u.username||u.password||!['https:','http:'].includes(u.protocol)||(u.protocol==='http:'&&u.origin!==origin))return {kind:'unsupported'};
  const drive=u.hostname==='drive.google.com'&&/^\/file\/d\/([A-Za-z0-9_-]+)\/(view|preview)$/.exec(u.pathname);
  if(drive)return {kind:'frame',provider:'Google Drive',src:'https://drive.google.com/file/d/'+drive[1]+'/preview'};
  const raw=u.hostname==='raw.githubusercontent.com'&&u.pathname.startsWith('/science-vault/school-resource-library/main/');
  const office=String(resource.extension||resource.filename?.split('.').pop()||'').toLowerCase();
  if(raw&&['doc','docx','ppt','pptx','pps','xls','xlsx'].includes(office))return {kind:'frame',provider:'Microsoft Office',src:'https://view.officeapps.live.com/op/embed.aspx?src='+encodeURIComponent(u.href)};
  // Only embed repository-hosted files. Other services may prohibit embedding.
  if(u.origin!==origin&&!raw)return {kind:'unsupported'};
  const extension=String(resource.extension||resource.filename?.split('.').pop()||'').toLowerCase();
  if(extension==='pdf')return raw?{kind:'pdf',provider:'PDF',src:u.href}:{kind:'frame',provider:'PDF',src:u.href};
  if(['png','jpg','jpeg','webp','gif','bmp'].includes(extension))return {kind:'image',src:u.href};
  if(['txt','csv','tsv'].includes(extension))return {kind:'text',src:u.href};
  if(['mp4','webm','mov'].includes(extension))return {kind:'video',src:u.href};
  if(['mp3','wav','ogg'].includes(extension))return {kind:'audio',src:u.href};
  return {kind:'unsupported'};
}
return {choose};
});

