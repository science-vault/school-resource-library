"""Render real first-page previews; keep failures available without fake covers."""
import hashlib
import json
import os
import shutil
import signal
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

OFFICE = {'.doc', '.docx', '.odt', '.rtf', '.ppt', '.pptx', '.odp', '.xls', '.xlsx'}
IMAGES = {'.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'}

def run(command, timeout=30):
    env = os.environ.copy()
    env['OMP_THREAD_LIMIT'] = '1'
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                               start_new_session=True, env=env)
    try:
        _, errors = process.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.communicate()
        raise RuntimeError('Preview conversion timed out')
    if process.returncode:
        raise RuntimeError(errors.decode(errors='replace')[-200:] or 'Conversion failed')

def thumbnail(source, destination):
    source, destination = Path(source).resolve(), Path(destination).resolve()
    if destination.exists() and destination.stat().st_size > 100:
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='assessment-preview-') as folder:
        work = Path(folder)
        if source.suffix.lower() in IMAGES:
            from PIL import Image, ImageOps
            with Image.open(source) as image:
                image = ImageOps.exif_transpose(image)
                image.thumbnail((600, 850))
                background = Image.new('RGB', image.size, 'white')
                if image.mode in ('RGBA', 'LA') or 'transparency' in image.info:
                    rgba = image.convert('RGBA')
                    background.paste(rgba, mask=rgba.getchannel('A'))
                else:
                    background.paste(image.convert('RGB'))
                background.save(work / 'page.jpg', quality=78)
        else:
            pdf = source
            if source.suffix.lower() in OFFICE:
                office = shutil.which('soffice') or shutil.which('libreoffice')
                if not office:
                    raise RuntimeError('LibreOffice unavailable')
                run([office, '-env:UserInstallation=' + (work / 'profile').as_uri(),
                     '--headless', '--convert-to', 'pdf', '--outdir', str(work), str(source)])
                pdf = work / (source.stem + '.pdf')
                if not pdf.exists():
                    raise RuntimeError('Document could not be converted')
            run(['pdftoppm', '-f', '1', '-singlefile', '-scale-to', '700', '-jpeg',
                 '-jpegopt', 'quality=78', str(pdf), str(work / 'page')], timeout=20)
        image = work / 'page.jpg'
        if not image.exists() or image.stat().st_size < 100:
            raise RuntimeError('First page could not be rendered')
        shutil.copyfile(image, destination)

def build(root):
    root = Path(root).resolve()
    output = root / '_site'
    catalog_path = output / 'catalog.json'
    catalog = json.loads(catalog_path.read_text(encoding='utf-8'))
    documents, failed = {}, []
    for row in catalog['resources']:
        source = (root / row['path']).resolve()
        if not any(source.is_relative_to(root / folder) for folder in ('schools', 'assessments')):
            continue
        if not source.is_file() or source.suffix.lower() not in OFFICE | IMAGES | {'.pdf'}:
            continue
        with source.open('rb') as stream:
            digest = hashlib.file_digest(stream, 'sha256').hexdigest()
        documents.setdefault(digest, {'source': source, 'rows': []})['rows'].append(row)

    def render(entry):
        digest, document = entry
        cached = root / '.thumbnail-cache' / (digest + '.jpg')
        relative = 'assets/thumbnails/' + digest + '.jpg'
        try:
            thumbnail(document['source'], cached)
            destination = output / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(cached, destination)
            return document, relative, None
        except (RuntimeError, OSError, ValueError) as error:
            return document, None, str(error)

    with ThreadPoolExecutor(max_workers=4) as pool:
        for index, (document, relative, error) in enumerate(pool.map(render, documents.items()), 1):
            for row in document['rows']:
                if relative:
                    row['thumbnail'] = relative
                else:
                    failed.append({'path': row['path'], 'reason': error})
            if index % 100 == 0:
                print(f'First pages checked: {index}/{len(documents)}', flush=True)
    catalog_path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report = {'generated': sum(bool(r.get('thumbnail')) for r in catalog['resources']),
              'total': len(catalog['resources']), 'failed': failed}
    (output / 'thumbnail-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(f"First-page previews: {report['generated']}/{report['total']}; failed: {len(failed)}", flush=True)
    return report

if __name__ == '__main__':
    build(Path(__file__).resolve().parents[1])
