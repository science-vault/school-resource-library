"""Use original filenames unless an owner explicitly supplies a display title.

Document text and cached heading guesses are deliberately not consulted: an
incorrect title can hide a task number, version, date or the purpose of a file.
"""
import json
from collections import Counter
from pathlib import Path


def title_for(row, path=None):
    return {'title': row['filename'], 'titleSource': 'filename', 'documentTitle': ''}


def enrich(catalogue, root):
    root = Path(root)
    changed = 0
    for row in catalogue['resources']:
        previous = row['title']
        result = title_for(row)
        path = root / row['path']
        metadata = path.with_name(path.name + '.metadata.json')
        if metadata.exists():
            # Match the catalogue builder's metadata validation and title limits.
            data = json.loads(metadata.read_text(encoding='utf-8'))
            if not isinstance(data, dict):
                raise ValueError(f'Metadata must be an object: {metadata}')
            if data.get('title'):
                result = {'title': previous, 'titleSource': 'manual metadata', 'documentTitle': ''}
        row['originalTitle'] = row['filename']
        row.update(result)
        changed += row['title'] != previous
    return {
        'policy': 'original filenames; explicit metadata titles take priority',
        'total': len(catalogue['resources']),
        'renamed': changed,
        'sources': dict(Counter(row['titleSource'] for row in catalogue['resources'])),
    }
