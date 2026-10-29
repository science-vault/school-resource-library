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
if __name__=='__main__':unittest.main()
