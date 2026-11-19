/* Curriculum browsing and conservative assessment-file associations. */
(function(root){'use strict';
const answer=/\b(?:solutions?|solns?|sols?|answers?|ans|mk|marking\s*(?:keys?|guides?|schemes?)|mark\s*schemes?|rubrics?)\b/gi;
const support=/\b(?:resources?|source\s*(?:booklets?|sheets?|materials?)|reference\s*sheets?|appendi(?:x|ces)|stimulus|extracts?|articles?|reading\s*materials?|data\s*(?:sheets?|files?|booklets?)|formula(?:e|s)?|constants?|instructions?|stimulus|scaffolds?|cover\s*sheets?|information\s*sheets?|extra\s*(?:questions?|qs)|teacher\s*notes?)\b/gi;
const numbers={one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',ten:'10'};
function words(s){return String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2').replace(/([a-zA-Z])(\d)/g,'$1 $2').replace(/(\d)([a-zA-Z])/g,'$1 $2').toLowerCase().replace(/[_–—-]+/g,' ').replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g,s=>numbers[s]).replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');}
function stem(r){return words((r.filename||r.title).replace(/\.[a-z0-9]{1,6}$/i,'').replace(/\s*\(\d+\)\s*$/,''));}
function integrated(r){return /\b(?:with|including) (?:the )?(?:answers?|solutions?)\b|\bquestions (?:and )?answers\b/.test(stem(r));}
function role(r){const s=stem(r);if(integrated(r))return 'Assessment';const withoutQuestionType=s.replace(/\b(?:short|extended|long|written) answers?\b/g,'');answer.lastIndex=0;if(withoutQuestionType!==s&&!answer.test(withoutQuestionType))return 'Assessment';if(/\b(?:answer|response) (?:booklets?|sheets?)\b/.test(s)&&! /\b(?:solutions?|marking|key)\b/.test(s))return 'Supporting resource';answer.lastIndex=support.lastIndex=0;if(r.type==='Solutions'||answer.test(s))return 'Answers / marking key';if(support.test(s))return 'Supporting resource';return 'Assessment';}
function base(r){answer.lastIndex=support.lastIndex=0;return stem(r).replace(answer,' ').replace(support,' ').replace(/\b(?:student|teacher|copy|version|final|edited|autosaved)\b/g,' ').replace(/\s+/g,' ').trim();}
function folder(r){return (r.path||'').split('/').slice(0,-1).filter(s=>! /^(?:solutions?|answers?|marking[ _-]*(?:guides?|keys?)|resources?|supporting[ _-]*(?:files|materials))$/i.test(s)).join('/');}
function taskNumbers(r){return [...stem(r).matchAll(/\b(?:task|test|assessment|assignment|quiz|exam)\s*(\d+)\b/g)].map(m=>m[1]);}
function enrich(r){
 let subject=r.subject||'Subject not specified';const pathway=/\bGeneral\b/i.test(subject)?'General':/\bATAR\b/i.test(subject)?'ATAR':'';
 let canonical=subject.replace(/\s+(ATAR|General)$/i,'').replace(/^Maths$/i,'Mathematics').replace(/^Mathematics essentials$/i,'Mathematics Essentials');
 if(/Integrated Science/i.test(canonical))canonical='Science';if(/English lit/i.test(canonical))canonical='English';
 const years=r.yearLevel?[Number(r.yearLevel)]:[];const parts=(r.path||'').split('/');
 const c=root.PowerPointCategories?root.PowerPointCategories.classify({title:r.filename||r.title,subject:canonical,years,topic:parts.slice(3,-1).join(' / ')}):{strand:'General resources',topic:'Other resources'};
 let area=/^(Science|Physics|Chemistry|Biology|Human Biology|Psychology|Earth and Environmental Science|Science in Practice)$/.test(canonical)?'Science':/^Mathematics/.test(canonical)?'Mathematics':/^(HASS|Humanities|History|Modern History|Ancient History|Geography|Economics|Accounting)/.test(canonical)?'Humanities and Social Sciences':/^(Health|Physical Education|PE Studies|HPE)/.test(canonical)?'Health and Physical Education':/^(Digital|Applied Information|Food Science|Hospitality)/.test(canonical)?'Technologies':canonical==='English'?'English':canonical;
 const lower=years.length&&years[0]<=10;if(area==='Science'&&lower){subject='Science';const path=parts.join(' ').toLowerCase();if(/general science|general resources/i.test(c.strand)){if(/biological[ _-]*sciences?|\bbiology\b/.test(path))c.strand='Biological Sciences';else if(/chemical[ _-]*sciences?|\bchemistry\b/.test(path))c.strand='Chemical Sciences';else if(/physical[ _-]*sciences?|\bphysics\b/.test(path))c.strand='Physical Sciences';else if(/earth.*space/.test(path))c.strand='Earth and Space Sciences';}}
 if(area==='Mathematics')c.strand=/statistics/i.test(c.topic)?'Statistics':/probability/i.test(c.topic)?'Probability':/geometry|transform/i.test(c.topic)?'Space':/measurement|trigonom|pythagoras/i.test(c.topic)?'Measurement':/algebra|function|equation|indices|calculus/i.test(c.topic)?'Algebra':'Number';
 const text=(r.path||'')+' '+r.filename;const unit=years[0]>=11?text.match(/\bunit[ _-]*([1-4])\b/i):null;
 return {...r,sourceSubject:r.subject,subject,area,pathway,unit:unit?'Unit '+unit[1]:'',strand:c.strand,topic:c.topic==='General & other resources'?'Other '+subject+' resources':c.topic};
}
function scope(r){return [r.sourceSubject||r.subject,r.yearLevel||'',r.schoolId||'unconfirmed'].join('|');}
function discriminators(r){const s=stem(r),out={};for(const m of s.matchAll(/\b(task|test|assessment|assignment|quiz|exam|semester|sem|unit|chapter|term|section|paper|part|version|ver|v)\s*(\d+|[a-d])\b/g)){const k=m[1]==='sem'?'semester':m[1];(out[k]||=new Set()).add(m[2]);}for(const m of s.matchAll(/\b([123]) ([abcd]{1,2})\b/g)){out.stageCode||=new Set();for(const letter of m[2])out.stageCode.add(m[1]+letter);}const years=s.match(/\b(?:19|20)\d{2}\b/g);if(years)out.calendarYear=new Set(years);return out;}
function compatible(a,b){if(scope(a)!==scope(b))return false;if(a.examYear&&b.examYear&&a.examYear!==b.examYear)return false;if((a.schoolId||'unconfirmed')==='unconfirmed'&&folder(a)!==folder(b))return false;const aa=discriminators(a),bb=discriminators(b);for(const k of Object.keys(aa))if(bb[k]&&![...aa[k]].some(n=>bb[k].has(n)))return false;if(/Sciences$/.test(a.strand||'')&&/Sciences$/.test(b.strand||'')&&a.strand!==b.strand)return false;return true;}
function score(a,b){if(!compatible(a,b))return 0;const x=base(a),y=base(b),same=folder(a)===folder(b);if(!x||!y)return 0;if(x===y)return same?1:(x.length>=14?.97:0);
 const ax=new Set(x.split(' ')),by=new Set(y.split(' '));const common=[...ax].filter(w=>by.has(w));const j=common.length/(new Set([...ax,...by]).size||1);const meaningful=common.filter(w=>w.length>3&&!/^(?:year|test|task|exam|atar|general|assessment|physics|chemistry|science|biology|human|mathematics|semester)$/.test(w)&&!/^\d+$/.test(w));
 if(same&&taskNumbers(a).length&&taskNumbers(b).length&&j>=.55&&common.length>=3)return .90;
 if(same&&j>=.66&&meaningful.length>=1)return .80+j*.1;
 if(same&&(x.includes(y)||y.includes(x))&&Math.min(x.length,y.length)>=12&&meaningful.length>=1)return .88;
 return 0;
}
function specificFolder(r){const name=words(folder(r).split('/').pop()).replace(/\b(?:19|20)\d{2}\b/g,'');return /\b(?:tasks?|assessments?|tests?|exams?|investigations?|projects?|assignments?|inquiry|practical)\b/.test(name)&&/[a-z0-9]/.test(name.replace(/\b(?:tasks?|assessments?|tests?|exams?|investigations?|projects?|assignments?|inquiry|practical|files|resources)\b/g,''));}
function packs(input){const resources=input.map(enrich),roles=new Map(resources.map(r=>[r.id,role(r)])),contexts=new Map();
 for(const r of resources){const key=scope(r)+'|'+folder(r);if(!contexts.has(key))contexts.set(key,[]);contexts.get(key).push(r);}
 for(const list of contexts.values()){if(!specificFolder(list[0]))continue;const auxiliary=r=>/\b(?:class activities|class activity|supporting materials?|supporting documents?|background reading|provided data|student resources?)\b/.test(stem(r));const candidates=list.filter(r=>roles.get(r.id)==='Assessment'&&['Exams','Tests','Assessments'].includes(r.type)&&!auxiliary(r));if(new Set(candidates.map(r=>base(r)+'|'+(r.examYear||''))).size!==1)continue;for(const r of list)if(roles.get(r.id)==='Assessment'&&(['Other resources','PowerPoints'].includes(r.type)||auxiliary(r))&&compatible(r,candidates[0]))roles.set(r.id,'Supporting resource');}
 const chosenRole=r=>roles.get(r.id),primary=resources.filter(r=>chosenRole(r)==='Assessment'),byScope=new Map(),groups=[],owner=new Map(),uncertain=[];
 for(const r of primary){const k=scope(r)+'|'+folder(r)+'|'+base(r)+'|'+(r.examYear||'');let g=byScope.get(k);if(!g){g={...r,files:[],associationNotes:[]};byScope.set(k,g);groups.push(g);}g.files.push({...r,fileRole:'Assessment'});owner.set(r.id,g.id);}
 const buckets=new Map();for(const g of groups){const k=scope(g);if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(g);}
 for(const r of resources.filter(r=>chosenRole(r)!=='Assessment')){
  let candidates=(buckets.get(scope(r))||[]).map(g=>({g,s:score(r,g)})).filter(v=>v.s>0).sort((a,b)=>b.s-a.s);
  if(!candidates.length){const f=folder(r),tail=f.split('/').pop()||'';const local=(buckets.get(scope(r))||[]).filter(g=>folder(g)===f&&compatible(r,g));if(local.length===1&&specificFolder(r))candidates=[{g:local[0],s:.79}];}
  if(candidates.length&&(!candidates[1]||candidates[0].s-candidates[1].s>=.06)){
   const {g,s}=candidates[0];g.files.push({...r,fileRole:chosenRole(r)});g.associationNotes.push({fileId:r.id,confidence:s,method:s===1?'Matching task name and folder':s>=.97?'Matching task name in the same school, subject and year':s===.79?'Only assessment in a named task folder':'Distinct task-name match within the same folder'});owner.set(r.id,g.id);
  }else{const g={...r,files:[{...r,fileRole:chosenRole(r)}],associationNotes:[],unlinkedAnswer:chosenRole(r)==='Answers / marking key'};groups.push(g);owner.set(r.id,g.id);if(candidates.length>1)uncertain.push({fileId:r.id,candidates:candidates.slice(0,3).map(v=>v.g.id)});}
 }
 for(const g of groups){g.integratedAnswers=g.files.some(integrated);g.answerCount=g.files.filter(f=>f.fileRole==='Answers / marking key').length+(g.integratedAnswers?1:0);g.supportCount=g.files.filter(f=>f.fileRole==='Supporting resource').length;g.searchText=g.files.map(f=>[f.filename,f.title,f.description,f.path].join(' ')).join(' ');}
 return {rows:groups,resources,owner,report:{sourceFiles:resources.length,packs:groups.length,linkedAnswerFiles:groups.reduce((n,g)=>n+g.files.filter(f=>f.fileRole==='Answers / marking key'&&f.id!==g.id).length,0),linkedSupportingFiles:groups.reduce((n,g)=>n+g.files.filter(f=>f.fileRole==='Supporting resource'&&f.id!==g.id).length,0),unlinkedAnswers:groups.filter(g=>g.unlinkedAnswer).length,ambiguous:uncertain}};
}
// File metadata is immutable during grouping; avoid re-tokenising names per candidate.
function memoize(fn){const values=new WeakMap();return function(row){if(values.has(row))return values.get(row);const value=fn(row);values.set(row,value);return value;};}
stem=memoize(stem);role=memoize(role);base=memoize(base);folder=memoize(folder);taskNumbers=memoize(taskNumbers);discriminators=memoize(discriminators);scope=memoize(scope);integrated=memoize(integrated);
root.AssessmentModel={packs,enrich,role,base,compatible};if(typeof module!=='undefined')module.exports=root.AssessmentModel;
})(typeof window==='undefined'?globalThis:window);
