"""Check the naming policy against the actual catalogue builder."""
import importlib.util
import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from document_titles import enrich

spec = importlib.util.spec_from_file_location('catalog', Path(__file__).with_name('build-catalog.py'))
catalog = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog)


class NamingTests(unittest.TestCase):
    def test_exact_filenames_keep_dates_versions_unicode_and_extensions(self):
        with TemporaryDirectory() as temp:
            root = Path(temp)
            folder = root / 'assessments/Physics/12/Example'
            folder.mkdir(parents=True)
            names = ['Year12_Task-3_MK_2024 (2).pdf', 'Énergie & motion V2.0.docx',
                     'Assessment_2023_Final-SOLUTIONS.PDF', '5.jpg', 'A' * 237 + '.pdf']
            for name in names:
                (folder / name).write_bytes(name.encode())
            data = catalog.build(root)
            before = [{k: row[k] for k in ('id', 'path', 'url', 'filename', 'type', 'schoolId', 'yearLevel')}
                      for row in data['resources']]
            report = enrich(data, root)
            self.assertEqual({r['title'] for r in data['resources']}, set(names))
            self.assertTrue(all(r['documentTitle'] == '' for r in data['resources']))
            self.assertEqual(report['sources'], {'filename': len(names)})
            self.assertEqual(before, [{k: row[k] for k in before[0]} for row in data['resources']])

    def test_explicit_metadata_title_takes_priority_and_filename_is_retained(self):
        with TemporaryDirectory() as temp:
            root = Path(temp)
            path = root / 'schools/example/physics/year-12/Task_2.pdf'
            path.parent.mkdir(parents=True)
            path.write_bytes(b'unreadable PDF')
            path.with_name(path.name + '.metadata.json').write_text(json.dumps({'title': 'Motion — Task 2'}))
            data = catalog.build(root)
            enrich(data, root)
            self.assertEqual(data['resources'][0]['title'], 'Motion — Task 2')
            self.assertEqual(data['resources'][0]['originalTitle'], 'Task_2.pdf')
            self.assertEqual(data['resources'][0]['titleSource'], 'manual metadata')

    def test_cached_guesses_are_ignored_and_policy_is_repeatable(self):
        with TemporaryDirectory() as temp:
            root = Path(temp)
            (root / '.title-cache').mkdir()
            (root / '.title-cache/records.json').write_text('{invalid old cache')
            data = {'resources': [{'id': 'stable', 'title': 'Wrong heading', 'filename': 'Task_4 (2).pdf',
                                   'path': 'assessments/Physics/12/Example/Task_4 (2).pdf'}]}
            enrich(data, root)
            first = json.dumps(data, sort_keys=True)
            enrich(data, root)
            self.assertEqual(json.dumps(data, sort_keys=True), first)
            self.assertEqual(data['resources'][0]['title'], 'Task_4 (2).pdf')


if __name__ == '__main__':
    unittest.main()
