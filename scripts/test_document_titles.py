import unittest
from unittest.mock import patch
from pathlib import Path
from document_titles import title_for
class NamingTests(unittest.TestCase):
 def row(self,name='Task Four SOLUTIONS.docx',subject='Accounting',kind='Solutions'):
  return {'filename':name,'title':Path(name).stem,'subject':subject,'school':'Applecross','examYear':'2020','type':kind}
 def title(self,lines,row=None):
  with patch('document_titles.lines_from',return_value=([(line,0) for line in lines],'document heading')):return title_for(row or self.row(),Path('unused.docx'))
 def test_cover_topic_and_key(self):
  result=self.title(['Unit 1 – Simple Financial Statements','Practice Assessment','Student Name:','SOLUTIONS!','Time allowed: 1 hour'])
  self.assertEqual(result['title'],'Task 4 — Simple Financial Statements — Practice Assessment — Marking Key (2020)')
 def test_name_field_cannot_replace_topic(self):
  r=self.row('Task 7 Fossil versus biofuels.docx','Chemistry','Assessments')
  result=self.title(['Fossil Fuels versus Biofuels – Energy and CO2 emissions','Task 7 Name','Due: _____','For this task you will write a report.'],r)
  self.assertIn('Energy and CO2 emissions',result['title']);self.assertNotIn('Name',result['title'])
 def test_chemical_solutions_is_preserved_in_topic(self):
  result=self.title(['Applecross SHS','Aqueous Solutions and Acidity','Test','Name SOLUTIONS'],self.row('Test MarkingKey.pdf','Chemistry'))
  self.assertIn('Aqueous Solutions and Acidity',result['title']);self.assertIn('Marking Key',result['title']);self.assertNotIn('SHS',result['title'])
 def test_body_prose_is_not_a_title(self):
  result=self.title(['After the unfortunate affair of the scorpion, the family','had given me a large room on the first floor in which to'],self.row('My Family and Other Animals.pdf','English lit','Other resources'))
  self.assertIn('My Family and Other Animals',result['title']);self.assertEqual(result['titleSource'],'filename')
 def test_document_assignment_heading_beats_course_header(self):
  result=self.title(['CHEMISTRY 3A3B','ASSIGNMENT #2 – ORGANIC CHEMISTRY','1. The table below lists seven alkanes.'],self.row('12Chem3A3BAssign2Organic-2013.doc','Chemistry','Assessments'))
  self.assertIn('Organic Chemistry',result['title']);self.assertNotIn('3A3B',result['title'])
 def test_related_versions_stay_distinct(self):
  lines=['Comparing Fossil Fuels and Biofuels']
  a=self.title(lines,self.row('Task 7 supplementary information.docx','Chemistry','Assessments'))
  b=self.title(lines,self.row('Task 7 Validation.docx','Chemistry','Assessments'))
  self.assertIn('Supporting Information',a['title']);self.assertIn('Validation',b['title']);self.assertNotEqual(a['title'],b['title'])
 def test_unreadable_document_retains_cleaned_filename(self):
  with patch('document_titles.lines_from',side_effect=ValueError()):
   result=title_for(self.row('Properties_and_Structures_of_Atoms_Test_(2).pdf','Chemistry','Tests'),Path('missing.pdf'))
  self.assertNotIn('_',result['title']);self.assertNotIn('(2)',result['title']);self.assertIn('Properties and Structures of Atoms Test',result['title'])
 def test_answer_sheet_content_is_recognised(self):
  result=self.title(['DIRECTIONS','1. Use pencil']+['1 [A] [B] [C] [D]']*5,self.row('multip1.doc','Chemistry','Other resources'))
  self.assertIn('Multiple Choice Answer Sheet',result['title'])
 def test_generic_heading_retains_filename_topic(self):
  result=self.title(['Comprehension Extended Response Assessment'],self.row('AnswerKey-OceanAcidification.pdf','Chemistry','Solutions'))
  self.assertIn('Ocean Acidification',result['title']);self.assertIn('Marking Key',result['title'])
if __name__=='__main__':unittest.main()
