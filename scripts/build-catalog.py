#!/usr/bin/env python3
"""Index subject-first assessments and legacy school folders without moving originals."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,unicodedata
from datetime import datetime,timezone
from urllib.parse import quote
EXTENSIONS={'.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx','.csv','.txt','.png','.jpg','.jpeg','.webp','.gif','.zip','.mp4','.mp3','.odt','.odp','.rtf','.bmp','.pub'}
TYPES={'exams':'Exams','exam':'Exams','solutions':'Solutions','marking-guides':'Solutions','assessments':'Assessments','lessons':'Lessons','powerpoints':'PowerPoints','worksheets':'Worksheets','programs':'Programs','other':'Other resources'}
LOCAL={'.pdf','.png','.jpg','.jpeg','.webp','.gif','.bmp','.txt','.csv','.mp4','.mp3'}
RAW='https://raw.githubusercontent.com/science-vault/school-resource-library/main/'
def read_json(path):
 if not path.exists():return {}
 value=json.loads(path.read_text(encoding='utf-8'))
 if not isinstance(value,dict):raise ValueError(f'Metadata must be an object: {path}')
 return value
def label(value):return str(value).replace('-',' ').replace('_',' ').strip().title()
def clean(value,default=''):return re.sub(r'\s+',' ',str(value or default)).strip()[:240]
def year_part(part):
 m=re.fullmatch(r'(?:year[-_ ]?)?([1-9]|10|11|12)',part,re.I)
 return m[1] if m else ''
def usable(file):
 return file.is_file() and not file.is_symlink() and file.suffix.lower() in EXTENSIONS and not any(p.startswith(('._','~$','-$')) or p.lower() in ['.ds_store','__macosx','thumbs.db','desktop.ini','readme.txt'] for p in file.parts)
def digest_file(file):
 h=hashlib.sha256()
 with file.open('rb') as stream:
  for chunk in iter(lambda:stream.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
def kind_for(file):
 name=re.sub(r'(?<=[a-z])(?=[A-Z])',' ',file.stem).replace('_',' ')
 if re.search(r'\b(?:solutions?|solns?|answers?(?:[ -]*key)?|mk|ans|marking[ -]*(?:key|guide|scheme))\b',name,re.I):return 'Solutions'
 if re.search(r'\bexam(?:ination)?s?\b',name,re.I):return 'Exams'
 if re.search(r'\b(?:tests?|quizzes|quiz)\b',name,re.I):return 'Tests'
 if re.search(r'\b(?:tasks?|assessments?|investigations?|inquir(?:y|ies)|projects?)\b',name,re.I):return 'Assessments'
 return 'PowerPoints' if file.suffix.lower() in ['.ppt','.pptx','.odp'] else 'Other resources'
def build(root):
 root=Path(root).resolve();resources=[];duplicates=[];seen={};schools={};accepted=[]
 for source in [root/'schools',root/'assessments']:
  if not source.exists():continue
  files=sorted(source.rglob('*'),key=lambda f:(not f.with_name(f.name+'.metadata.json').exists(),not (source/f.relative_to(source).parts[0]/'_school.json').exists(),f.as_posix()))
  for file in files:
   if not usable(file):continue
   parts=file.relative_to(source).parts;modern=source.name=='assessments'
   if len(parts)<(3 if modern else 2):continue
   repository_path=file.relative_to(root).as_posix();accepted.append(repository_path)
   meta=read_json(file.with_name(file.name+'.metadata.json'));schoolmeta={};year=clean(meta.get('yearLevel'));kind=clean(meta.get('type'))
   if modern:
    subject=clean(meta.get('subject'),parts[0]);school='School not confirmed';found=year_part(parts[1])
    if found:
     year=year or found
     if len(parts)>3 and not re.fullmatch(r'(?:19|20)\d{2}',parts[2]):school=parts[2]
    else:
     school=parts[1]
     for part in parts[2:-1]:year=year or year_part(part)
     if not year:
      candidates={m[1] for sibling in file.parent.iterdir() for m in re.finditer(r'\b(?:year|yr)[ _-]*(1[12]|[1-9])(?:\b|(?=[A-Za-z]))',sibling.stem,re.I)}
      if len(candidates)==1:year=candidates.pop()
    school=clean(meta.get('school'),school)
    slug=re.sub(r'[^a-z0-9]+','-',unicodedata.normalize('NFKD',school).encode('ascii','ignore').decode().lower()).strip('-') or 'unconfirmed'
    if school.casefold() in ['school not confirmed','unknown','unconfirmed','unsorted']:school='School not confirmed';slug='unconfirmed'
    kind=kind or kind_for(file)
   else:
    slug=parts[0];schoolmeta=read_json(source/slug/'_school.json');school=clean(schoolmeta.get('name'),label(slug))
    subject=clean(meta.get('subject'),label(parts[1]) if len(parts)>2 else 'General')
    for part in parts[2:-1]:
     year=year or year_part(part)
     if part.lower() in TYPES and not kind:kind=TYPES[part.lower()]
    if slug in ['unconfirmed','unsorted','unknown']:school='School not confirmed'
   year=year.removeprefix('Year ').removeprefix('year ')
   if year and not re.fullmatch(r'[1-9]|10|11|12',year):raise ValueError(f'Invalid year level for {file.name}')
   schoolrow=schools.setdefault(slug,{'id':slug,'name':school,'shortName':clean(schoolmeta.get('shortName')),'location':clean(schoolmeta.get('location')),'resourceCount':0,'subjects':set()})
   digest=digest_file(file);identity=(digest,subject,year,slug) if modern else digest
   if identity in seen:
    duplicates.append({'path':repository_path,'sameAs':seen[identity]['path'],'sha256':digest});seen[identity].setdefault('alsoStoredAt',[]).append(repository_path);continue
   title=clean(meta.get('title'),re.sub(r'[_-]+',' ',file.stem));exam_year=clean(meta.get('examYear'))
   if modern and not exam_year:
    match=re.search(r'(?<!\d)((?:19|20)\d{2})(?!\d)',' '.join(parts[2:]))
    if match:exam_year=match[1]
   if exam_year and not re.fullmatch(r'20\d\d|19\d\d',exam_year):raise ValueError(f'Invalid exam year for {file.name}')
   url='/'.join(quote(p,safe='') for p in file.relative_to(root).parts)
   if modern and file.suffix.lower() not in LOCAL:url=RAW+url
   item={'id':hashlib.sha256((digest+'|'+subject+'|'+year+'|'+slug).encode()).hexdigest() if modern else digest,'title':title,'filename':file.name,'schoolId':slug,'school':school,'subject':subject,'yearLevel':year,'type':kind or ('PowerPoints' if file.suffix.lower() in ['.ppt','.pptx'] else 'Other resources'),'examYear':exam_year,'extension':file.suffix[1:].upper(),'size':file.stat().st_size,'path':repository_path,'url':url,'added':clean(meta.get('added')),'description':clean(meta.get('description'))}
   resources.append(item);seen[identity]=item;schoolrow['resourceCount']+=1;schoolrow['subjects'].add(subject)
 accounted={p for item in resources for p in [item['path'],*item.get('alsoStoredAt',[])]};missing=sorted(set(accepted)-accounted)
 if missing:raise ValueError('Unaccounted uploaded files: '+str(missing))
 for value in schools.values():value['subjects']=sorted(value['subjects'])
 return {'version':1,'generatedAt':datetime.now(timezone.utc).isoformat(),'resources':resources,'schools':sorted([s for s in schools.values() if s['resourceCount']],key=lambda s:s['name'].casefold()),'duplicates':duplicates,'importReport':{'sourceDocuments':len(accepted),'indexedRecords':len(resources),'duplicateCopies':len(duplicates),'unaccountedFiles':missing}}
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));p.add_argument('--output',default='_site');args=p.parse_args();root=Path(args.root).resolve();out=root/args.output
 if out.resolve() in [root,root/'schools',root/'assessments',root/'site']:raise ValueError('Use a separate build output directory.')
 catalogue=build(root)
 import importlib.util
 spec=importlib.util.spec_from_file_location('document_titles',Path(__file__).with_name('document_titles.py'));titles=importlib.util.module_from_spec(spec);spec.loader.exec_module(titles)
 title_report=titles.enrich(catalogue,root)
 if out.exists():shutil.rmtree(out)
 shutil.copytree(root/'site',out)
 for item in catalogue['resources']:
  if item['url'].startswith('https:'):continue
  target=out/item['path'];target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(root/item['path'],target)
 (out/'title-report.json').write_text(json.dumps(title_report,indent=2)+'\n')
 (out/'import-report.json').write_text(json.dumps(catalogue['importReport'],indent=2)+'\n')
 (out/'catalog.json').write_text(json.dumps(catalogue,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(f"Built {len(catalogue['resources'])} unique resources from {len(catalogue['schools'])} schools; {len(catalogue['duplicates'])} duplicate copies omitted from listings.")
if __name__=='__main__':main()
