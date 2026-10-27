const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const src=fs.readFileSync('backend/Code.gs','utf8');
function make(records=[]){
  let calls=[],written=[];
  const props={CLIENT_ID:'client.apps.googleusercontent.com',ADMIN_SUBS:'admin-sub',REGISTER_ID:'register',PENDING_ID:'pending',APPROVED_ID:'approved',REJECTED_ID:'rejected'};
  const sheet={getLastRow:()=>records.length+1,getRange:()=>({getValues:()=>records.map((r,i)=>[r.id,JSON.stringify(r)]),setValues:v=>written.push(v)})};
  const ctx=vm.createContext({console,PropertiesService:{getScriptProperties:()=>({getProperties:()=>props})},SpreadsheetApp:{openById:()=>({getSheetByName:()=>sheet}),flush:()=>{}},ContentService:{MimeType:{JSON:'json'},createTextOutput:s=>({setMimeType:()=>JSON.parse(s)})},UrlFetchApp:{fetch:()=>{calls.push('fetch');throw Error('network should not be called')}},CacheService:{getScriptCache:()=>({get:()=>null})}});
  vm.runInContext(src,ctx);return {ctx,calls,written};
}
const example={filename:'Paper.pdf',size:1024,school:'Example School',subject:'Science',year:8,type:'Exams',createdYear:2026};
test('valid lower and upper school metadata; rejects traversal, unsupported types and size',()=>{
 const {ctx}=make();assert.equal(ctx.validate_(example).yearLevel,'8');
 for(const change of [{filename:'../paper.pdf'},{filename:'code.html'},{size:501*1024*1024},{year:6},{school:'A/B'},{type:'Unknown'}])assert.throws(()=>ctx.validate_({...example,...change}));
 assert.equal(ctx.validate_({...example,year:12,subject:'Physics ATAR'}).yearLevel,'12');
});
test('admin role comes only from configured Google subject, never request email',()=>{
 const {ctx}=make();assert.equal(ctx.admin_({sub:'ordinary',email:'admin-sub'}),false);assert.equal(ctx.admin_({sub:'admin-sub'}),true);assert.throws(()=>ctx.requireAdmin_({sub:'ordinary'}));
});
test('contributors cannot read or modify another submission',()=>{
 const {ctx}=make([{id:'secret',owner:'other'}]);assert.throws(()=>ctx.owned_('secret',{sub:'person'}));assert.equal(ctx.owned_('secret',{sub:'admin-sub'}).data.id,'secret');
});
test('public catalogue excludes pending and never leaks session URL, email or owner',()=>{
 const r={id:'a',owner:'private-sub',submitter:'private@example.com',sessionUrl:'SECRET',filename:'Paper.pdf',school:'School',subject:'Science',size:1,status:'approved',yearLevel:'8',createdYear:2026,fileId:'approved-id'};
 const {ctx}=make([r,{...r,id:'pending',status:'pending'}]);const out=ctx.doGet({parameter:{action:'catalog'}});assert.equal(out.resources.length,1);const text=JSON.stringify(out);for(const s of ['SECRET','private@example.com','private-sub'])assert.ok(!text.includes(s));
});
test('expired sessions and unverified Google credentials fail closed',()=>{
 const {ctx}=make();assert.throws(()=>ctx.user_('x'));assert.throws(()=>ctx.user_('a'.repeat(72)));assert.throws(()=>ctx.login_(''));
});
test('POST errors do not echo secrets from backend exceptions',()=>{
 const {ctx}=make();const out=ctx.doPost({postData:{contents:JSON.stringify({action:'review',session:'invalid'})}});assert.equal(out.ok,false);assert.ok(!JSON.stringify(out).includes('Bearer'));
});
test('repeated approval cannot publish a pending or uploading file accidentally',()=>{
 const {ctx,calls}=make([{id:'a',owner:'u',status:'uploading'}]);assert.throws(()=>ctx.review_({id:'a',decision:'approve',confirmPublic:true},{sub:'admin-sub'}));assert.equal(calls.length,0);
});
