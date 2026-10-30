from pathlib import Path
from tempfile import TemporaryDirectory
import importlib.util,json,unittest
spec=importlib.util.spec_from_file_location('catalog',Path(__file__).with_name('build-catalog.py'));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class CatalogueTests(unittest.TestCase):
 def test_school_metadata_duplicates_and_unknown_origin(self):
  with TemporaryDirectory() as temp:
   root=Path(temp);a=root/'schools/example-school/physics/year-12/worksheets';a.mkdir(parents=True);(a/'Motion & graphs.txt').write_text('Unique worksheet content');(a.parents[2]/'_school.json').write_text(json.dumps({'name':'Example School','shortName':'ES'}));(a/'Motion & graphs.txt.metadata.json').write_text(json.dumps({'title':'Motion and graphs','subject':'Physics','yearLevel':'12','type':'Worksheets'}))
   b=root/'schools/another-school/physics/year-12/worksheets';b.mkdir(parents=True);(b/'Duplicate.txt').write_text('Unique worksheet content')
   c=root/'schools/unconfirmed/chemistry/year-11/exams';c.mkdir(parents=True);(c/'New paper.txt').write_text('Different content')
   data=module.build(root);self.assertEqual(len(data['resources']),2);self.assertEqual(len(data['duplicates']),1);self.assertEqual(len(data['schools']),2);first=next(q for q in data['resources'] if q['title']=='Motion and graphs');self.assertEqual(first['school'],'Example School');self.assertEqual(first['yearLevel'],'12');self.assertIn('%26',first['url']);self.assertEqual(next(q for q in data['resources'] if q['filename']=='New paper.txt')['school'],'School not confirmed')
 def test_metadata_and_temporary_files_are_never_resources(self):
  with TemporaryDirectory() as temp:
   root=Path(temp);folder=root/'assessments/Physics/12/Example';folder.mkdir(parents=True)
   (folder/'real.pdf').write_bytes(b'real assessment')
   for name in ['._real.pdf','~$real.docx','-$real.doc','.DS_Store','Thumbs.db','desktop.ini','real.pdf.metadata.json']:
    (folder/name).write_bytes(b'{}')
   nested=folder/'__MACOSX';nested.mkdir();(nested/'unwanted.pdf').write_bytes(b'junk')
   web=folder/'Saved page_files';web.mkdir();(web/'profile.jpg').write_bytes(b'web asset')
   data=module.build(root)
   self.assertEqual([r['filename'] for r in data['resources']],['real.pdf'])
   self.assertEqual(data['importReport']['sourceDocuments'],1)
 def test_empty_collection(self):
  with TemporaryDirectory() as temp:self.assertEqual(module.build(temp)['resources'],[])
 def test_invalid_year_fails_clearly(self):
  with TemporaryDirectory() as temp:
   p=Path(temp)/'schools/school/physics/file.txt';p.parent.mkdir(parents=True);p.write_text('content');p.with_name(p.name+'.metadata.json').write_text('{"yearLevel":"invalid"}')
   with self.assertRaisesRegex(ValueError,'Invalid year level'):module.build(temp)
 def test_subject_first_nested_uploads_and_metadata(self):
  with TemporaryDirectory() as temp:
   r=Path(temp);a=r/'assessments/Chemistry/11/Applecross/2020/Task 1';a.mkdir(parents=True)
   (a/'Task.docx').write_bytes(b'paper');(a/'Task (2).docx').write_bytes(b'paper');(a/'Task MK.pdf').write_bytes(b'key')
   for name in ['~$Task.docx','._Task.pdf','-$Task.doc','.DS_Store','Thumbs.db']:(a/name).write_bytes(b'junk')
   b=r/'assessments/Chemistry/11/Willetton';b.mkdir(parents=True);(b/'Task.docx').write_bytes(b'paper')
   c=r/'assessments/Science/1/Primary';c.mkdir(parents=True);(c/'Quiz.pdf').write_bytes(b'primary')
   d=r/'assessments/Biology General/Byford/2021';d.mkdir(parents=True);(d/'Year 11 Task.docx').write_bytes(b'biology');(d/'Other task.docx').write_bytes(b'biology2')
   e=r/'assessments/Chemistry/12';(e/'Unknown school quiz.pdf').parent.mkdir(parents=True,exist_ok=True);(e/'Unknown school quiz.pdf').write_bytes(b'unknown')
   out=module.build(r);self.assertEqual(len(out['resources']),7);self.assertEqual(len(out['duplicates']),1);self.assertEqual(out['importReport']['sourceDocuments'],8);self.assertEqual(out['importReport']['unaccountedFiles'],[])
   self.assertEqual(len({v['id'] for v in out['resources']}),7)
   paper=next(v for v in out['resources'] if v['school']=='Applecross' and v['extension']=='DOCX');self.assertEqual((paper['subject'],paper['yearLevel'],paper['examYear']),('Chemistry','11','2020'));self.assertTrue(paper['url'].startswith(module.RAW))
   self.assertEqual(next(v for v in out['resources'] if v['filename']=='Task MK.pdf')['type'],'Solutions')
   self.assertEqual(next(v for v in out['resources'] if v['school']=='Primary')['yearLevel'],'1')
   self.assertTrue(all(v['yearLevel']=='11' for v in out['resources'] if v['school']=='Byford'))
   self.assertEqual(next(v for v in out['resources'] if v['filename']=='Unknown school quiz.pdf')['school'],'School not confirmed')
 def test_lower_school_year_subject_source_and_bookmark_alias(self):
  with TemporaryDirectory() as temp:
   root=Path(temp)
   for location,content in [('Lowerschool/8/Science/Biological Sciences/Narrogin/2018/Task 1.pdf',b'science'),('Lowerschool/8/Maths/Pearson/Chapter 01/Test.docx',b'maths'),('Lowerschool/8/Maths/Another School/Test.docx',b'maths'),('Lowerschool/9/HASS/Unknown source task.pdf',b'hass')]:
    f=root/'assessments'/location;f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(content)
   data=module.build(root);self.assertEqual(len(data['resources']),4)
   science=next(x for x in data['resources'] if x['filename']=='Task 1.pdf');self.assertEqual((science['subject'],science['yearLevel'],science['school']),('Science','8','Narrogin'));self.assertEqual(science['examYear'],'2018');self.assertEqual(len(science['legacyIds']),1)
   maths=[x for x in data['resources'] if x['subject']=='Maths'];self.assertEqual({x['school'] for x in maths},{'Pearson','Another School'});self.assertEqual(len({x['id'] for x in maths}),2)
   hass=next(x for x in data['resources'] if x['subject']=='HASS');self.assertEqual(hass['school'],'School not confirmed');self.assertEqual(hass['yearLevel'],'9')
   self.assertTrue(all(x['url'].startswith(module.RAW) for x in data['resources']))
 def test_originals_are_not_copied_into_the_pages_artifact(self):
  import subprocess,sys
  with TemporaryDirectory() as temp:
   root=Path(temp);(root/'site').mkdir();(root/'site/index.html').write_text('<html>Library</html>')
   f=root/'assessments/Lowerschool/10/Science/Example/Big test.pdf';f.parent.mkdir(parents=True);f.write_bytes(b'%PDF-test'*10000)
   subprocess.run([sys.executable,str(Path(module.__file__)),'--root',str(root)],check=True,capture_output=True)
   self.assertTrue((root/'_site/index.html').exists());self.assertFalse((root/'_site/assessments').exists());self.assertEqual(f.stat().st_size,90000)
   row=json.loads((root/'_site/catalog.json').read_text())['resources'][0];self.assertEqual(row['title'],'Big test.pdf');self.assertTrue(row['url'].startswith(module.RAW))
if __name__=='__main__':unittest.main()

