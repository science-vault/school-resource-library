(() => {
'use strict';
const $=id=>document.getElementById(id),config=window.schoolLibraryUploadConfig||{};
let session='',admin=false,busy=false,paused=false,loginTimer;
function message(s){$('message').textContent=s;}
function node(tag,text){const n=document.createElement(tag);n.textContent=text;return n;}
function activeConfig(){return config.enabled===true&&/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(config.endpoint)&&/^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/.test(config.clientId);}
async function api(action,data={}){
  if(!activeConfig())throw Error('Direct uploads are not active yet.');
  const r=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({...data,action,session}),redirect:'follow'});
  if(!r.ok)throw Error('The upload service could not be reached.');
  const value=await r.json();
  if(!value.ok)throw Error(value.error||'The request failed.');
  return value;
}
function setBusy(value){busy=value;$('uploadButton').disabled=value;$('pauseButton').hidden=!value;$('pauseButton').disabled=false;document.querySelectorAll('.review-action').forEach(b=>b.disabled=value);}
function rawID(r){return r.id.replace(/^drive:/,'');}
function showTab(tab){['upload','mine','review'].forEach(t=>$(t+'Panel').hidden=t!==tab);if(tab==='mine')loadMine();if(tab==='review'&&admin)loadQueue();}
async function login(credential){
  try{
    const r=await api('login',{credential});session=r.session;admin=r.isAdmin;
    $('identity').textContent='Signed in'+(admin?' as an administrator.':'.')+' Account ID: '+r.subject;
    $('signedIn').hidden=false;$('signOut').hidden=false;$('googleSignIn').hidden=true;$('reviewTab').hidden=!admin;
    message('');if(location.hash==='#review'&&admin)showTab('review');
  }catch(e){message(e.message);}
}
function startSignIn(){
  if(!window.google?.accounts?.id){loginTimer=setTimeout(startSignIn,400);return;}
  google.accounts.id.initialize({client_id:config.clientId,callback:r=>login(r.credential),auto_select:false});
  google.accounts.id.renderButton($('googleSignIn'),{theme:'outline',size:'large'});
  $('identity').textContent='Sign in to submit resources or review uploads.';
}
function bytes64(buffer){const a=new Uint8Array(buffer);let s='';for(let i=0;i<a.length;i+=32768)s+=String.fromCharCode(...a.subarray(i,i+32768));return btoa(s);}
async function transfer(file,id,offset){
  paused=false;setBusy(true);$('progress').hidden=false;
  try{
    let state=await api('status',{id});offset=state.offset;
    while(state.status==='uploading'&&offset<file.size){
      if(paused){$('uploadStatus').textContent='Paused. Find this file under My submissions to resume.';return;}
      const bytes=bytes64(await file.slice(offset,offset+1024*1024).arrayBuffer());
      state=await api('chunk',{id,offset,bytes});
      offset=state.offset;$('progress').value=offset/file.size*100;
      $('uploadStatus').textContent=file.name+': '+Math.floor(offset/file.size*100)+'% uploaded';
    }
    $('uploadStatus').textContent=state.status==='pending'?'Upload received. It is private and awaiting admin approval.':'Submission status: '+state.status;
  }catch(e){message(e.message+'\nCheck My submissions to resume this file.');throw e;}
  finally{setBusy(false);}
}
$('uploadForm').addEventListener('submit',async e=>{
  e.preventDefault();if(busy||!session)return;
  const files=[...$('files').files];
  if(files.length>10){message('Choose up to 10 files at a time.');return;}
  message('');
  for(const file of files){
    if(!file.size||file.size>500*1024*1024){message(file.name+': maximum file size is 500 MB.');return;}
    try{
      setBusy(true);
      const r=await api('start',{filename:file.name,size:file.size,school:$('school').value,subject:$('subject').value,year:Number($('year').value),type:$('type').value,createdYear:Number($('createdYear').value)});
      await transfer(file,r.id,r.offset);if(paused)break;
    }catch(e){message(e.message);setBusy(false);break;}
  }
});
$('pauseButton').onclick=()=>{paused=true;$('pauseButton').disabled=true;};
function submission(r){
  const div=node('article','');div.className='submission';
  div.append(node('h3',r.filename),node('p',[r.school,'Year '+r.yearLevel,r.subject,r.type,r.examYear].join(' · ')),node('small','Status: '+r.status));
  return div;
}
async function loadMine(){
  try{
    const r=await api('mine');$('mineList').replaceChildren();
    if(!r.resources.length)$('mineList').append(node('p','You have no submissions yet.'));
    for(const item of r.resources){
      const div=submission(item);
      if(item.status==='uploading'){
        const input=document.createElement('input');input.type='file';input.setAttribute('aria-label','Select original file to resume '+item.filename);
        input.onchange=async()=>{
          const f=input.files[0];if(!f)return;
          if(f.name!==item.filename||f.size!==item.size){message('Select the original file with the same name and size.');return;}
          if(busy)return;showTab('upload');
          try{await transfer(f,rawID(item),item.offset);}catch(_){} 
        };div.append(input);
      }
      if(item.reviewNote)div.append(node('p','Review note: '+item.reviewNote));
      $('mineList').append(div);
    }
  }catch(e){message(e.message);}
}
async function loadQueue(){
  if(!admin)return;
  try{
    const r=await api('queue');$('queueList').replaceChildren();
    if(!r.resources.length)$('queueList').append(node('p','There are no files awaiting approval.'));
    for(const item of r.resources){
      const div=submission(item),actions=node('div','');actions.className='submission-actions';
      const link=node('a','Open original for review');link.href=item.previewURL;link.target='_blank';link.rel='noopener';
      const note=document.createElement('textarea');note.maxLength=500;note.placeholder='Optional review note';note.setAttribute('aria-label','Review note for '+item.filename);
      const label=node('label',''),confirm=document.createElement('input');confirm.type='checkbox';
      label.className='consent';label.append(confirm,document.createTextNode('I checked this file and approve making it publicly accessible.'));
      for(const decision of ['approve','reject']){
        const button=node('button',decision==='approve'?'Approve and publish':'Reject');button.type='button';button.className='secondary review-action';
        button.onclick=async()=>{
          if(decision==='approve'&&!confirm.checked){message('Confirm public sharing before approving.');return;}
          if(busy)return;setBusy(true);
          try{await api('review',{id:rawID(item),decision,confirmPublic:confirm.checked,note:note.value});message('');await loadQueue();}
          catch(e){message(e.message);}finally{setBusy(false);}
        };actions.append(button);
      }
      div.append(node('small','Submitted by: '+item.submitter),link,note,label,actions);$('queueList').append(div);
    }
  }catch(e){message(e.message);}
}
$('signOut').onclick=()=>{if(busy){message('Pause the upload before signing out.');return;}session='';admin=false;$('signedIn').hidden=true;$('signOut').hidden=true;$('googleSignIn').hidden=false;$('mineList').replaceChildren();$('queueList').replaceChildren();$('identity').textContent='Signed out.';google.accounts.id.disableAutoSelect();};
$('refreshMine').onclick=loadMine;$('refreshQueue').onclick=loadQueue;
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));
if(activeConfig())startSignIn();else{$('setupNotice').hidden=false;}
})();
