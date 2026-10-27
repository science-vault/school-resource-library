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
if __name__=='__main__':unittest.main()
