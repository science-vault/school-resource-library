"""Conservative document-heading extraction; originals and download names stay intact."""
from pathlib import Path
from zipfile import ZipFile,BadZipFile
from xml.etree import ElementTree as ET
import re,shutil,subprocess,tempfile,unicodedata
W='{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
WORDS={'one':'1','two':'2','three':'3','four':'4','five':'5','six':'6','seven':'7','eight':'8','nine':'9','ten':'10','eleven':'11','twelve':'12'}
TASK=r'\b(?:assessment\s+)?task\s*[:#.-]?\s*(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b'

def run(args,timeout=35):
 result=subprocess.run(args,capture_output=True,timeout=timeout)
 if result.returncode:raise ValueError('Text extraction unavailable')
 return result.stdout.decode('utf-8',errors='replace')
def normal(text):
 text=unicodedata.normalize('NFKC',text).replace('\ufeff','').replace('\x00','')
 return re.sub(r'\s+',' ',text).strip(' \t|:;–—-!')
def pretty(text):
 text=normal(text)
 if text.isupper() and sum(c.isalpha() for c in text)>4:
  text=text.title()
  for word in ['ATAR','GST','ICT','DNA','CO2','MCQ','MCQs','WACE','AEP']:
   text=re.sub(r'\b'+word+r'\b',word,text,flags=re.I)
 return text

def lines_from(path):
 path=Path(path);ext=path.suffix.lower();lines=[];method='document heading'
 if ext=='.docx':
  with ZipFile(path) as z:
   if z.getinfo('word/document.xml').file_size>25_000_000:raise ValueError('Oversized Word XML')
   root=ET.fromstring(z.read('word/document.xml'))
   for p in root.iter(W+'p'):
    text=''.join((e.text or '') if e.tag==W+'t' else '\n' if e.tag==W+'br' else ' ' if e.tag==W+'tab' else '' for e in p.iter())
    style=p.find('./'+W+'pPr/'+W+'pStyle');boost=15 if style is not None and re.search('title|heading',style.get(W+'val',''),re.I) else 0
    sizes=[int(e.get(W+'val','0')) for e in p.iter(W+'sz') if e.get(W+'val','').isdigit()]
    boost+=min(15,max(0,(max(sizes or [22])-22)/2))
    for line in text.splitlines():
     if normal(line):lines.append((normal(line),boost))
    if len(lines)>90:break
 elif ext=='.pdf':
  text=run(['pdftotext','-f','1','-l','2','-layout',str(path),'-'])
  if len(re.findall(r'[A-Za-z]{3,}',text))<8:
   if not shutil.which('tesseract'):return [],'no readable heading'
   with tempfile.TemporaryDirectory(prefix='assessment-title-') as folder:
    prefix=str(Path(folder)/'cover')
    run(['pdftoppm','-f','1','-singlefile','-scale-to','1800','-png',str(path),prefix])
    text=run(['tesseract',prefix+'.png','stdout','--psm','11'],timeout=45);method='scanned document heading'
  lines=[(normal(line),0) for line in text.splitlines() if normal(line)]
 elif ext=='.doc':
  if shutil.which('antiword'):text=run(['antiword','-w','130',str(path)])
  elif shutil.which('soffice'):
   with tempfile.TemporaryDirectory(prefix='assessment-title-') as folder:
    run(['soffice','-env:UserInstallation='+Path(folder,'profile').as_uri(),'--headless','--convert-to','txt:Text','--outdir',folder,str(path.resolve())],timeout=60)
    text=Path(folder,path.stem+'.txt').read_text(errors='replace')
  else:return [],'no readable heading'
  lines=[(normal(line),0) for line in text.splitlines() if normal(line)]
 return lines[:90],method

def cleaned_filename(name):
 text=Path(name).stem
 text=re.sub(r'(?<=[a-z])(?=[A-Z])',' ',text).replace('_',' ')
 text=re.sub(r'\b(?:solns?|soln)\b','Solutions',text,flags=re.I)
 text=re.sub(r'\b(?:MK|markingkey|answerkey)\b','Marking Key',text,flags=re.I)
 text=re.sub(r'\bPrac\b','Practice',text,flags=re.I)
 text=re.sub(r'\bAssign\b','Assignment',text,flags=re.I)
 text=re.sub(r'\bInvest\b','Investigation',text,flags=re.I)
 text=re.sub(r'\bStruct\b','Structure',text,flags=re.I)
 text=re.sub(r'^(?:Y(?:ear)?\s*)?(?:11|12)\s*Chem(?:istry)?(?:\s*3A3B)?\s*','',text,flags=re.I)
 text=re.sub(r'(?<=\d)(?=[A-Z][a-z])',' ',text)
 text=re.sub(r'(?<=[A-Za-z])(?=\d)', ' ',text) if not re.search('CO2|DNA',text) else text
 text=re.sub(r'\bAssign\b','Assignment',text,flags=re.I)
 text=re.sub(r'\.(?:docx?|pdf)$','',text,flags=re.I)
 text=re.sub(r'\s*\(\d+\)\s*$','',text)
 text=re.sub(r'(?<!\d)(?:19|20)\d{2}(?!\d)','',text)
 return pretty(text)

def meaningful(line,subject='',school=''):
 if not 4<=len(line)<=145 or not re.search(r'[A-Za-z]{3}',line):return False
 if re.fullmatch(r'(?:name|solution|solutions|chapter|directions|question|questions|content|conditions|type|project|general|ATAR|CG|school)',line,re.I):return False
 if len(re.findall(r'[A-Za-z]+',line))<2 and line.casefold() not in ['nonfiction','fiction','homeostasis','electrochemistry','stoichiometry','equilibrium']:return False
 if len(line.split())>8 and (line.endswith(('.',',')) or re.match(r'^(after|before|because|there|here|in groups)\b',line,re.I)):return False
 if re.match(r'^(?:'+re.escape(school)+r')\s+(?:senior|high|secondary|SHS|SHS\b)',line,re.I):return False
 course=re.sub(r'[^a-z]','',subject.lower().replace(' general','').replace(' atar',''))
 if re.sub(r'[^a-z]','',line.lower())==course:return False
 if re.fullmatch(r'(?:Chemistry|Biology|Physics|Science|English|Accounting|Health Studies)\s*[1-4][A-C](?:[1-4][A-C])?',line,re.I):return False
 if not line.lstrip('0123456789 .()').startswith(tuple('ABCDEFGHIJKLMNOPQRSTUVWXYZ')):return False
 if '@' in line or re.search(r'https?://|[_…]{3}|\.{4}|\bwww\.|\b(?:name|teacher|candidate|student|date|due|marks? allocated|time allowed|material|standard items|special items|instructions?|supervisor|question.?answer booklet|question booklet|answer booklet|working time|reading time|important note)\s*[:_]|\?',line,re.I):return False
 if re.match(r'^(?:to be provided|material|instructions?|time allowed|working time|reading time|important note|name\b|student\b|teacher\b|what you need|what\b|which\b|explain\b|identify\b|describe\b|calculate\b|you\b|for this\b|this (?:question|assessment)|marks?\b|total\b|page\b|section\b|standard items|special items|part\s+[A-Z]\b)',line,re.I):return False
 if re.search(r'\b(?:college|high school|school curriculum|standards authority|copyright|all rights|school crest)\b',line,re.I):return False
 low=re.sub(r'[^a-z]','',line.lower())
 if low in {re.sub(r'[^a-z]','',v.lower()) for v in [subject,school,'Marking Key','Solutions','Answers','Question Answer Booklet','Multiple Choice','Short Answer','Extended Answer','Assessment type','Content','Conditions','Task weighting','Project']} :return False
 if re.fullmatch(r'(?:year|yr\.?|unit|semester)\s*[0-9 &/-]+(?:\s*(?:atar|general|science|chemistry|biology|english|health studies|accounting and finance))*',line,re.I):return False
 return True

def title_for(row,path):
 fallback=cleaned_filename(row['filename']);raw=[];method='filename'
 try:raw,method=lines_from(path)
 except (OSError,ValueError,KeyError,BadZipFile,RuntimeError,subprocess.TimeoutExpired,ET.ParseError):raw=[]
 # Only cover/heading material is eligible; stop at instructions or long prose.
 cover=[]
 for index,(line,boost) in enumerate(raw[:35]):
  if index>1 and (re.match(r'^(?:time allowed|materials? required|instructions? to|what you need to do|for this task|important note|multiple choice|question\s+(?:one|1|six|6)\b)',line,re.I) or len(line)>180 or re.match(r'^\d+\.\s*[A-Za-z]',line)):break
  cover.append((line,boost))
 task=None
 for text in [*[x[0] for x in cover[:8]],fallback]:
  m=re.search(TASK,text,re.I)
  if m:task='Task '+WORDS.get(m[1].lower(),m[1]);break
 candidates=[]
 for index,(line,boost) in enumerate(cover):
  line=re.split(r'\b(?:student\s*)?name\s*:',line,flags=re.I)[0].strip()
  if not meaningful(line,row.get('subject',''),row.get('school','')):continue
  core=normal(re.sub(TASK,'',line,flags=re.I))
  core=normal(re.sub(r'^unit\s*\d+\s*[–—:-]\s*','',core,flags=re.I))
  core=re.sub(r'(?<!\d)(?:19|20)\d{2}(?!\d)','',core).strip(' –—-:')
  core=re.sub(r'\s+(?:Student\s+)?Name\s*$', '',core,flags=re.I).strip()
  core=re.sub(r'^\(?\d+%\)?\s*','',core)
  core=re.sub(r'^\d{1,2}\s+(?:GENERAL|ATAR)\s+(?:HB|BIO|CHEM|PHYS)\s+','',core,flags=re.I)
  if ': ' in core and len(core.split(': ',1)[1].split())>6:core=core.split(': ',1)[0]
  if core and not meaningful(core,row.get('subject',''),row.get('school','')):continue
  if not core or core.lower() in ['assessment','practice assessment','topic test','test','validation test','question paper','examination','exam']:continue
  course=re.search(r'\b(?:ATAR|GENERAL|YEAR\s*\d|YR\.?\s*\d|UNIT\s*\d)\b',line,re.I)
  score=65-index*4+min(boost,22)+(12 if task and re.search(TASK,line,re.I) else 0)-(35 if course else 0)
  if re.search(r'\b(?:investigation|inquiry|response|test|assessment|assignment|project|quiz|financial|record keeping|narrative|comparing)\b',core,re.I):score+=12
  if re.match(r'^(?:the |a |an |use |write |draw |create |planning|question|type:|content:)',core,re.I):score-=35
  candidates.append((score,index,pretty(core)))
 chosen=max(candidates,default=None,key=lambda x:(x[0],-x[1]))
 source=method if chosen and chosen[0]>=35 else 'filename'
 core=chosen[2] if source!='filename' else fallback
 generic=re.sub(r'\b(?:comprehension|extended|short|response|answer|assessment|test|quiz|topic|task|paper|booklet|examination|practice|validation|case|study)\b','',core,flags=re.I).strip(' —–-:')
 if source!='filename' and not generic:
  detail=re.sub(r'\b(?:marking\s*(?:key|guide)|solutions?|answers?)\b','',fallback,flags=re.I).strip(' —–-:')
  if detail and detail.casefold()!=core.casefold():core=detail+' — '+core
 if task:
  core=normal(re.sub(TASK,'',core,flags=re.I))
  core=re.sub(r'^(?:assessment|practice assessment)\s*[–—:-]?\s*','',core,flags=re.I)
  core=task+(' — '+core if core else '')
 filename_key=bool(re.search(r'marking[ -]*(?:key|guide)|answer[ -]*key|(?:solutions?|solns?|answers?)\s*(?:Draft\s*\d*)?\s*(?:\(\d+\))?\s*$',fallback,re.I))
 heading_key=any(re.search(r'\bmarking\s*(?:key|guide)\b',x[0],re.I) or re.fullmatch(r'(?:name\s*)?solutions?[! ]*',x[0],re.I) for x in cover[:8])
 role='Marking Key' if filename_key or heading_key else ''
 if role:
  core=re.sub(r'\b(?:marking\s*(?:key|guide)|answer\s*key)\b','',core,flags=re.I).strip(' –—-:')
  if source=='filename':core=re.sub(r'\b(?:solutions?|answers?)\s*$', '',core,flags=re.I).strip(' –—-:')
 qualifiers=[]
 for pattern,label in [(r'\bvalidation\b','Validation'),(r'supplementary information|supporting information','Supporting Information'),(r'in[ -]class essay','In-class Essay')]:
  if re.search(pattern,fallback,re.I) and not re.search(pattern,core,re.I):qualifiers.append(label)
 if re.search(r'practice assessment', ' '.join(x[0] for x in cover[:4]),re.I) and 'practice' not in core.lower():qualifiers.append('Practice Assessment')
 for part in re.findall(r'\bPart\s+[A-D]\b',fallback,re.I):
  if part.casefold() not in core.casefold():qualifiers.append(part)
 if any(x[0].casefold()=='project' for x in cover[:8]) and 'project' not in core.casefold():qualifiers.append('Project')
 draft=re.search(r'\bDraft\s*\d*\b',fallback,re.I)
 if draft and 'draft' not in core.casefold():qualifiers.append(draft[0])
 if role:qualifiers.append(role)
 core=' — '.join([core,*qualifiers])
 if len(re.findall(r'[A-Za-z]+',core))<3 or re.fullmatch(r'Task \d+(?: — Marking Key)?',core):core=row['subject']+' — '+core
 if re.search(r'\bmultip\s*\d*\b',fallback,re.I) and sum('[A]' in x[0] and '[B]' in x[0] for x in raw)>3:
  core='Multiple Choice Answer Sheet';source='document content'
 years={m[0] for text,_ in cover[:8] if not re.search('copyright|edition|published|©',text,re.I) and (re.fullmatch(r'(?:19|20)\d{2}',text) or re.search(r'year|task|assessment|test|semester|ATAR|general',text,re.I)) for m in re.finditer(r'(?<!\d)(?:19|20)\d{2}(?!\d)',text)}
 year=next(iter(years)) if len(years)==1 else row.get('examYear','')
 if year and str(year) not in core:core+=' ('+str(year)+')'
 core=re.sub(r'CO2(?=[A-Za-z])','CO2 ',core)
 return {'title':normal(core)[:240],'titleSource':source,'documentTitle':chosen[2] if chosen and source!='filename' else core if source=='document content' else ''}

def enrich(catalogue,root):
 import hashlib,json
 from collections import Counter
 from concurrent.futures import ThreadPoolExecutor
 root=Path(root);cache_dir=root/'.title-cache';cache_dir.mkdir(exist_ok=True);cache_path=cache_dir/'records.json'
 try:cache=json.loads(cache_path.read_text())
 except (OSError,ValueError):cache={}
 def rename(row):
  path=root/row['path'];meta=path.with_name(path.name+'.metadata.json')
  if meta.exists():
   try:
    if json.loads(meta.read_text()).get('title'):return row,{'title':row['title'],'titleSource':'manual metadata','documentTitle':''}
   except (ValueError,OSError):pass
  key=hashlib.sha256(json.dumps([row['id'],row['filename'],row['subject'],row['school'],row.get('examYear'),row.get('type')],sort_keys=True).encode()).hexdigest()
  if key not in cache:cache[key]=title_for(row,path)
  return row,cache[key]
 changed=0
 with ThreadPoolExecutor(4) as pool:
  for index,(row,result) in enumerate(pool.map(rename,catalogue['resources']),1):
   row['originalTitle']=row['title'];row.update(result);changed+=row['title']!=row['originalTitle']
   if index%100==0:print('Document names checked:',index,flush=True)
 cache_path.write_text(json.dumps(cache,ensure_ascii=False))
 return {'total':len(catalogue['resources']),'renamed':changed,'sources':dict(Counter(r['titleSource'] for r in catalogue['resources']))}
