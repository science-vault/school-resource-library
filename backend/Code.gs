/* School Library: Google Apps Script V8 backend.
 * OAuth tokens and upload session URLs NEVER leave this server.
 * Deploy only after completing SETUP.md and live acceptance tests.
 */
const CHUNK = 1024 * 1024;
const MAX_FILE = 500 * 1024 * 1024;
const TYPES = ['Exams','Solutions','Assessments','PowerPoints','Worksheets','Lessons','Programs','Other resources'];
const MIME = {pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',xls:'application/vnd.ms-excel',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',mp4:'video/mp4',mp3:'audio/mpeg',zip:'application/zip',txt:'text/plain',csv:'text/csv'};
function config_() {
  const p = PropertiesService.getScriptProperties().getProperties();
  ['CLIENT_ID','ADMIN_SUBS','REGISTER_ID','PENDING_ID','APPROVED_ID','REJECTED_ID'].forEach(k => { if (!p[k]) throw Error('Backend setup is incomplete.'); });
  return p;
}
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) {
  try {
    config_();
    if (e && e.parameter.action === 'catalog') return json_({ok:true,resources:records_().map(x=>x.data).filter(r=>r.status==='approved').map(public_)});
    return json_({ok:true,version:1});
  } catch (_) { return json_({ok:false,error:'Backend setup is incomplete.'}); }
}
function doPost(e) {
  try {
    config_();
    if (!e || !e.postData || e.postData.contents.length > 1500000) throw Error('Request is too large.');
    const b = JSON.parse(e.postData.contents);
    if (b.action === 'login') return json_({ok:true,...login_(b.credential)});
    const u = user_(b.session);
    if (b.action === 'me') return json_({ok:true,subject:u.sub,isAdmin:admin_(u)});
    if (b.action === 'mine') return json_({ok:true,resources:records_().map(x=>x.data).filter(r=>r.owner===u.sub).map(private_)});
    if (b.action === 'queue') {
      requireAdmin_(u);
      return json_({ok:true,resources:records_().map(x=>x.data).filter(r=>r.status==='pending').map(private_)});
    }
    const result = locked_(() => {
      if (b.action === 'start') return start_(b,u);
      if (b.action === 'status') return status_(owned_(b.id,u));
      if (b.action === 'chunk') return chunk_(b,u);
      if (b.action === 'review') { requireAdmin_(u); return review_(b,u); }
      throw Error('Unknown action.');
    });
    return json_({ok:true,...result});
  } catch (err) {
    // Never echo UrlFetch exception strings: these can contain bearer session URLs.
    return json_({ok:false,error:err.safeMessage || 'Request could not be completed. Sign in again or contact the administrator.'});
  }
}
function fail_(message) { const e = Error(message); e.safeMessage=message; throw e; }
function locked_(f) { const l=LockService.getScriptLock(); if(!l.tryLock(20000)) fail_('The library is busy. Please retry.'); try{return f();}finally{l.releaseLock();} }
function login_(credential) {
  if(typeof credential!=='string'||credential.length>10000) fail_('Google sign-in is required.');
  const response=UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?id_token='+encodeURIComponent(credential),{muteHttpExceptions:true});
  if(response.getResponseCode()!==200) fail_('Google sign-in could not be verified.');
  const c=JSON.parse(response.getContentText()),p=config_();
  if(c.aud!==p.CLIENT_ID||!['accounts.google.com','https://accounts.google.com'].includes(c.iss)||Number(c.exp)*1000<=Date.now()||!c.sub||(c.email_verified!==true&&c.email_verified!=='true')) fail_('Google sign-in could not be verified.');
  const session=Utilities.getUuid()+Utilities.getUuid();
  CacheService.getScriptCache().put('auth:'+session,JSON.stringify({sub:c.sub,email:c.email}),1800);
  return {session,subject:c.sub,isAdmin:admin_(c)};
}
function user_(session) {
  if(typeof session!=='string'||!/^[a-f0-9-]{72}$/.test(session)) fail_('Please sign in with Google.');
  const value=CacheService.getScriptCache().get('auth:'+session);
  if(!value) fail_('Your session expired. Sign in again; your upload can resume.');
  return JSON.parse(value);
}
function admin_(u) { return config_().ADMIN_SUBS.split(',').map(s=>s.trim()).includes(u.sub); }
function requireAdmin_(u) { if(!admin_(u)) fail_('Only an administrator can review submissions.'); }
function sheet_() { return SpreadsheetApp.openById(config_().REGISTER_ID).getSheetByName('Submissions'); }
function records_() {
  const s=sheet_(); if(!s) throw Error('Register not configured.');
  if(s.getLastRow()<2)return [];
  return s.getRange(2,1,s.getLastRow()-1,2).getValues().map((v,i)=>({row:i+2,data:JSON.parse(v[1])}));
}
function write_(entry) { sheet_().getRange(entry.row,1,1,2).setValues([[entry.data.id,JSON.stringify(entry.data)]]); SpreadsheetApp.flush(); }
function owned_(id,u) {
  const e=records_().find(x=>x.data.id===id);
  if(!e||(e.data.owner!==u.sub&&!admin_(u))) fail_('Submission not found.');
  return e;
}
function text_(v,max) { if(typeof v!=='string'||!v.trim()||v.length>max||/[\u0000-\u001f/\\]/.test(v))fail_('Check the school, subject and filename.');return v.trim(); }
function validate_(b) {
  const filename=text_(b.filename,180),extension=filename.split('.').pop().toLowerCase();
  if(!MIME[extension])fail_('That file type is not supported.');
  if(!Number.isSafeInteger(b.size)||b.size<1||b.size>MAX_FILE)fail_('Files must be between 1 byte and 500 MB.');
  if(!Number.isInteger(b.year)||b.year<7||b.year>12||!TYPES.includes(b.type))fail_('Choose a valid year and resource type.');
  const createdYear=Number(b.createdYear);
  if(!Number.isInteger(createdYear)||createdYear<1900||createdYear>2100)fail_('Enter a valid year created.');
  return {filename,extension:extension.toUpperCase(),mime:MIME[extension],size:b.size,school:text_(b.school,120),subject:text_(b.subject,100),yearLevel:String(b.year),type:b.type,createdYear};
}
function drive_(path,options) {
  const r=UrlFetchApp.fetch('https://www.googleapis.com/drive/v3/'+path,{...options,headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),...(options&&options.headers)},muteHttpExceptions:true});
  if(r.getResponseCode()<200||r.getResponseCode()>=300)fail_('Google Drive could not complete the request.');
  return JSON.parse(r.getContentText()||'{}');
}
function start_(b,u) {
  const m=validate_(b),all=records_().map(x=>x.data),day=new Date().toISOString().slice(0,10);
  if(all.filter(r=>r.owner===u.sub&&r.added.slice(0,10)===day).length>=10)fail_('Daily limit reached: 10 new files per account.');
  if(all.filter(r=>r.added.slice(0,10)===day).reduce((n,r)=>n+r.size,0)+m.size>2*1024*1024*1024)fail_('The library daily upload allowance has been reached.');
  if(all.some(r=>r.owner===u.sub&&r.status!=='rejected'&&r.filename===m.filename&&r.size===m.size&&r.school===m.school))fail_('You have already submitted a file with this name, school and size. Check My submissions.');
  const id=Utilities.getUuid();
  const res=UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,size,md5Checksum,mimeType,parents',{
    method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'X-Upload-Content-Type':m.mime,'X-Upload-Content-Length':String(m.size)},
    payload:JSON.stringify({name:m.filename,parents:[config_().PENDING_ID],appProperties:{librarySubmission:id}}),muteHttpExceptions:true
  });
  const headers=res.getAllHeaders(),sessionUrl=headers.Location||headers.location;
  if(res.getResponseCode()!==200||!sessionUrl||!sessionUrl.startsWith('https://www.googleapis.com/upload/drive/v3/'))fail_('Could not start the upload.');
  const data={id,...m,owner:u.sub,submitter:u.email,added:new Date().toISOString(),status:'uploading',offset:0,sessionUrl};
  sheet_().appendRow([id,JSON.stringify(data)]);
  return {id,offset:0,chunkSize:CHUNK};
}
function status_(entry) {
  const r=entry.data;
  if(r.status!=='uploading')return {id:r.id,status:r.status,offset:r.offset};
  const res=UrlFetchApp.fetch(r.sessionUrl,{method:'put',headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'Content-Range':'bytes */'+r.size},payload:'',muteHttpExceptions:true,followRedirects:false});
  return uploadResponse_(entry,res);
}
function uploadResponse_(entry,res) {
  const r=entry.data,code=res.getResponseCode();
  if(code===308) {
    const h=res.getAllHeaders(),range=h.Range||h.range||'',match=/^bytes=0-(\d+)$/.exec(range);
    r.offset=match?Number(match[1])+1:0;write_(entry);
  } else if(code===200||code===201) {
    const f=JSON.parse(res.getContentText());
    if(!f.id)fail_('Upload verification failed.');
    const meta=drive_('files/'+encodeURIComponent(f.id)+'?fields=id,name,size,parents,md5Checksum,appProperties,mimeType');
    if(Number(meta.size)!==r.size||!meta.parents.includes(config_().PENDING_ID)||meta.appProperties.librarySubmission!==r.id)fail_('Upload verification failed.');
    r.fileId=f.id;r.md5=meta.md5Checksum||'';r.offset=r.size;r.status='pending';delete r.sessionUrl;write_(entry);
  } else if(code===404||code===410) fail_('This upload session expired. Start a new upload.');
  else fail_('Upload interrupted. Use Resume to check the saved position.');
  return {id:r.id,status:r.status,offset:r.offset};
}
function chunk_(b,u) {
  const e=owned_(b.id,u),r=e.data;
  if(r.status!=='uploading')return {id:r.id,status:r.status,offset:r.offset};
  if(!Number.isSafeInteger(b.offset)||b.offset!==r.offset) return status_(e);
  if(typeof b.bytes!=='string'||b.bytes.length>1400000)fail_('Invalid upload chunk.');
  const bytes=Utilities.base64Decode(b.bytes),remaining=r.size-r.offset;
  if(bytes.length!==Math.min(CHUNK,remaining))fail_('Invalid upload chunk length.');
  const res=UrlFetchApp.fetch(r.sessionUrl,{method:'put',contentType:r.mime,headers:{Authorization:'Bearer '+ScriptApp.getOAuthToken(),'Content-Range':'bytes '+r.offset+'-'+(r.offset+bytes.length-1)+'/'+r.size},payload:bytes,muteHttpExceptions:true,followRedirects:false});
  return uploadResponse_(e,res);
}
function private_(r) { return {...public_(r),status:r.status,submitter:r.submitter,offset:r.offset,reviewNote:r.reviewNote||'',previewURL:r.fileId?'https://drive.google.com/file/d/'+r.fileId+'/view':''}; }
function public_(r) { return {id:'drive:'+r.id,title:r.filename.replace(/\.[^.]+$/,''),filename:r.filename,schoolId:r.school.toLowerCase(),school:r.school,subject:r.subject,yearLevel:r.yearLevel,type:r.type,examYear:String(r.createdYear),extension:r.extension,size:r.size,added:r.added,description:'',url:r.fileId?'https://drive.google.com/file/d/'+r.fileId+'/view':''}; }
function folder_(parent,name) { const fs=parent.getFoldersByName(name);return fs.hasNext()?fs.next():parent.createFolder(name); }
function review_(b,u) {
  if(!['approve','reject'].includes(b.decision))fail_('Choose approve or reject.');
  const e=owned_(b.id,u),r=e.data;
  if(r.status!=='pending')fail_('This submission has already been reviewed or is not finished.');
  if(b.decision==='approve'&&records_().some(x=>x.data.status==='approved'&&x.data.md5&&x.data.md5===r.md5))fail_('An identical file is already approved.');
  const f=DriveApp.getFileById(r.fileId),p=config_();
  if(b.decision==='reject') {
    f.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
    f.moveTo(DriveApp.getFolderById(p.REJECTED_ID));r.status='rejected';
  } else {
    if(b.confirmPublic!==true)fail_('Confirm that this resource may be made publicly accessible.');
    let dest=DriveApp.getFolderById(p.APPROVED_ID);
    [r.school,'Year '+r.yearLevel,r.subject,r.type,String(r.createdYear)].forEach(n=>{dest=folder_(dest,n);});
    try {
      f.moveTo(dest);
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);
      r.status='approved';
    } catch (_) {
      f.setSharing(DriveApp.Access.PRIVATE,DriveApp.Permission.NONE);
      f.moveTo(DriveApp.getFolderById(p.PENDING_ID));
      fail_('Approval failed. The file has been returned to private pending storage.');
    }
  }
  r.reviewNote=typeof b.note==='string'?b.note.slice(0,500):'';
  r.reviewedAt=new Date().toISOString();r.reviewedBy=u.sub;write_(e);
  return {status:r.status};
}

/** Run once in the Apps Script editor after reviewing requested permissions. */
function initializeSchoolLibrary() {
  const p=PropertiesService.getScriptProperties();
  p.setProperties({
    PENDING_ID:'1wk4Im_5H0z_ljN4jUEkYonfCJtyXMyZd',
    APPROVED_ID:'1upugSTAFfPZnhK9TF55QvljJpEAZrgcp',
    REJECTED_ID:'1q84cDE7TlnNlYHGCT_0K0V1oP_lNPnEf'
  });
  if(!p.getProperty('REGISTER_ID')){
    const ss=SpreadsheetApp.create('School Library - Private Submission Register');
    ss.getSheets()[0].setName('Submissions').appendRow(['Submission ID','Private record JSON']);
    DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById('1tV3FNgeK-IkdyReDZcqZmDMcgYPelVoy'));
    p.setProperty('REGISTER_ID',ss.getId());
  }
  return 'Private register ready. Configure CLIENT_ID and ADMIN_SUBS, then deploy.';
}
