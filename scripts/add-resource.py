#!/usr/bin/env python3
"""Copy a new resource into its school folder without changing the original."""
from pathlib import Path
import argparse,hashlib,json,re,shutil,unicodedata
from datetime import datetime,timezone
ROOT=Path(__file__).resolve().parents[1]
def slug(s):
 s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower();return re.sub(r'[^a-z0-9]+','-',s).strip('-')
def main():
 p=argparse.ArgumentParser();p.add_argument('file');p.add_argument('--school',required=True);p.add_argument('--subject',required=True);p.add_argument('--year',choices=[str(x) for x in range(7,13)],required=True);p.add_argument('--type',choices=['exams','solutions','assessments','powerpoints','worksheets','lessons','programs','other'],required=True);p.add_argument('--exam-year');p.add_argument('--title');a=p.parse_args();source=Path(a.file).resolve()
 if not source.is_file():p.error('Source file does not exist.')
 if not slug(a.school) or not slug(a.subject):p.error('School and subject need a name.')
 digest=hashlib.sha256(source.read_bytes()).hexdigest()
 for f in (ROOT/'schools').rglob('*'):
  if f.is_file() and f.suffix.lower()==source.suffix.lower() and hashlib.sha256(f.read_bytes()).hexdigest()==digest:print('Already stored:',f.relative_to(ROOT));return
 folder=ROOT/'schools'/slug(a.school)/slug(a.subject)/('year-'+a.year)/a.type;folder.mkdir(parents=True,exist_ok=True);target=folder/source.name
 if target.exists():target=folder/(source.stem+'-'+digest[:8]+source.suffix)
 shutil.copy2(source,target);schoolfile=ROOT/'schools'/slug(a.school)/'_school.json'
 if not schoolfile.exists():schoolfile.write_text(json.dumps({'name':a.school},ensure_ascii=False,indent=2)+'\n')
 meta={'title':a.title or source.stem,'subject':a.subject,'yearLevel':a.year,'type':{'solutions':'Solutions','powerpoints':'PowerPoints','other':'Other resources'}.get(a.type,a.type.title()),'added':datetime.now(timezone.utc).isoformat()}
 if a.exam_year:meta['examYear']=a.exam_year
 target.with_name(target.name+'.metadata.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n');print('Added:',target.relative_to(ROOT))
if __name__=='__main__':main()
