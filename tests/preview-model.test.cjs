const test=require('node:test'),assert=require('node:assert/strict');
const {choose}=require('../site/preview-model.js');
const base='https://science-vault.github.io/school-resource-library/';
test('repository PDFs and images preview locally with their exact URLs',()=>{
 assert.deepEqual(choose({extension:'PDF'},'schools/a/Paper%20one.pdf',base),{kind:'frame',provider:'PDF',src:base+'schools/a/Paper%20one.pdf'});
 assert.equal(choose({extension:'PNG'},'schools/a/diagram.png',base).kind,'image');
});
test('Drive previews use the provider preview route',()=>{
 assert.deepEqual(choose({extension:'PPTX'},'https://drive.google.com/file/d/abc_123-xyz/view',base),{kind:'frame',provider:'Google Drive',src:'https://drive.google.com/file/d/abc_123-xyz/preview'});
});
test('unsafe URLs and lookalike hosts cannot be embedded',()=>{
 for(const url of ['javascript:alert(1)','data:text/html,test','https://user:secret@drive.google.com/file/d/abc/view','https://drive.google.com.evil.example/file/d/abc/view','https://example.com/paper.pdf','http://example.com/paper.pdf']){
  assert.equal(choose({extension:'PDF'},url,base).kind,'unsupported',url);
 }
});
test('unsupported repository Office and active content use the original-file fallback',()=>{
 for(const extension of ['DOCX','PPTX','XLSX','ZIP','HTML','SVG'])assert.equal(choose({extension},'schools/a/file.'+extension.toLowerCase(),base).kind,'unsupported');
});
test('plain text and media select their appropriate viewers',()=>{
 for(const [extension,kind]of [['TXT','text'],['CSV','text'],['MP4','video'],['MP3','audio']])assert.equal(choose({extension},'schools/a/file',base).kind,kind);
});
test('uploaded Word files use Office and unrelated repositories stay blocked',()=>{
 const url='https://raw.githubusercontent.com/science-vault/school-resource-library/main/assessments/Chemistry/11/School/Task%201.docx';
 const result=choose({extension:'DOCX'},url,base);
 assert.equal(result.provider,'Microsoft Office');assert.equal(new URL(result.src).searchParams.get('src'),url);
 assert.equal(choose({extension:'DOCX'},url.replace('/school-resource-library/','/other-repo/'),base).kind,'unsupported');
});

test('repository PDF originals are fetched into the PDF viewer without bundling them',()=>{const url='https://raw.githubusercontent.com/science-vault/school-resource-library/main/assessments/Lowerschool/8/Science/School/Test%201.pdf';assert.deepEqual(choose({extension:'PDF'},url,base),{kind:'pdf',provider:'PDF',src:url});for(const other of [url.replace('/school-resource-library/','/other-repo/'),url.replace('raw.githubusercontent.com','raw.githubusercontent.com.evil.example')])assert.equal(choose({extension:'PDF'},other,base).kind,'unsupported');});
test('repository image, text and media originals retain preview modes',()=>{for(const [extension,kind]of [['JPG','image'],['CSV','text'],['MP4','video'],['MP3','audio']]){const url='https://raw.githubusercontent.com/science-vault/school-resource-library/main/assessments/file.'+extension.toLowerCase();assert.equal(choose({extension},url,base).kind,kind);}});
