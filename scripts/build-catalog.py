#!/usr/bin/env python3
"""Build the website and catalogue from the school-organised repository."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,unicodedata
from datetime import datetime,timezone
from urllib.parse import quote
EXTENSIONS={'.pdf','.doc','.docx','.ppt','.pptx','.xls','.xlsx','.csv','.txt','.png','.jpg','.jpeg','.webp','.gif','.zip','.mp4','.mp3','.odt','.odp'}
TYPES={'exams':'Exams','exam':'Exams','solutions':'Solutions','marking-guides':'Solutions','assessments':'Assessments','lessons':'Lessons','powerpoints':'PowerPoints','worksheets':'Worksheets','programs':'Programs','other':'Other resources'}
def read_json(path):
 if not path.exists():return {}
 value=json.loads(path.read_text(encoding='utf-8'))
 if not isinstance(value,dict):raise ValueError(f'Metadata must be an object: {path}')
 return value
def label(value):return str(value).replace('-',' ').replace('_',' ').strip().title()
def clean(value,default=''):
 return re.sub(r'\s+',' ',str(value or default)).strip()[:240]
def build(root):
 root=Path(root).resolve();schoolroot=root/'schools';resources=[];duplicates=[];seen={};schools={}
 if schoolroot.exists():
  for file in sorted(schoolroot.rglob('*'),key=lambda f:(not f.with_name(f.name+'.metadata.json').exists(),not (schoolroot/f.relative_to(schoolroot).parts[0]/'_school.json').exists(),f.as_posix())):
   if not file.is_file() or file.is_symlink() or file.suffix.lower() not in EXTENSIONS or file.name.lower() in ['readme.txt']:continue
   rel=file.relative_to(schoolroot);parts=rel.parts
   if len(parts)<2:continue
   slug=parts[0];schoolmeta=read_json(schoolroot/slug/'_school.json');meta=read_json(file.with_name(file.name+'.metadata.json'))
   school=clean(schoolmeta.get('name'),label(slug))
   if slug in ['unconfirmed','unsorted','unknown']:school='School not confirmed'
   subject=clean(meta.get('subject'),label(parts[1]) if len(parts)>2 else 'General')
   year=clean(meta.get('yearLevel'));kind=clean(meta.get('type'))
   for part in parts[2:-1]:
    m=re.fullmatch(r'(?:year[-_ ]?)?(7|8|9|10|11|12)',part,re.I)
    if m and not year:year=m[1]
    if part.lower() in TYPES and not kind:kind=TYPES[part.lower()]
   year=year.removeprefix('Year ').removeprefix('year ')
   if year and not re.fullmatch(r'7|8|9|10|11|12',year):raise ValueError(f'Invalid year level for {file.name}')
   schoolrow=schools.setdefault(slug,{'id':slug,'name':school,'shortName':clean(schoolmeta.get('shortName')),'location':clean(schoolmeta.get('location')),'resourceCount':0,'subjects':set()})
   digest=hashlib.sha256(file.read_bytes()).hexdigest();repository_path=file.relative_to(root).as_posix()
   if digest in seen:
    duplicates.append({'path':repository_path,'sameAs':seen[digest]['path'],'sha256':digest});seen[digest].setdefault('alsoStoredAt',[]).append(repository_path);continue
   title=clean(meta.get('title'),re.sub(r'[_-]+',' ',file.stem));exam_year=clean(meta.get('examYear'))
   if exam_year and not re.fullmatch(r'20\d\d|19\d\d',exam_year):raise ValueError(f'Invalid exam year for {file.name}')
   item={'id':digest,'title':title,'filename':file.name,'schoolId':slug,'school':school,'subject':subject,'yearLevel':year,'type':kind or ('PowerPoints' if file.suffix.lower() in ['.ppt','.pptx'] else 'Other resources'),'examYear':exam_year,'extension':file.suffix[1:].upper(),'size':file.stat().st_size,'path':repository_path,'url':'/'.join(quote(p,safe='') for p in file.relative_to(root).parts),'added':clean(meta.get('added')),'description':clean(meta.get('description'))}
   resources.append(item);seen[digest]=item;schoolrow['resourceCount']+=1;schoolrow['subjects'].add(subject)
 for value in schools.values():value['subjects']=sorted(value['subjects'])
 return {'version':1,'generatedAt':datetime.now(timezone.utc).isoformat(),'resources':resources,'schools':sorted([s for s in schools.values() if s['resourceCount']],key=lambda s:s['name'].casefold()),'duplicates':duplicates}
def main():
 p=argparse.ArgumentParser();p.add_argument('--root',default=str(Path(__file__).resolve().parents[1]));p.add_argument('--output',default='_site');args=p.parse_args();root=Path(args.root).resolve();out=root/args.output
 if out.resolve() in [root,root/'schools',root/'site']:raise ValueError('Use a separate build output directory.')
 catalogue=build(root)
 if out.exists():shutil.rmtree(out)
 shutil.copytree(root/'site',out)
 if (root/'schools').exists():shutil.copytree(root/'schools',out/'schools')
 (out/'catalog.json').write_text(json.dumps(catalogue,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(f"Built {len(catalogue['resources'])} unique resources from {len(catalogue['schools'])} schools; {len(catalogue['duplicates'])} duplicate copies omitted from listings.")
if __name__=='__main__':main()
