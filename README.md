# School Resource Library

A separate resource repository and website for new uploads, organised by **school → subject → year level → resource type**. Existing Learning Vault files have not been copied or moved.

## Website

The website provides search, school browsing, subject and year filters, resource type filters, file details, download links, and bookmarks saved on each visitor's device. The collection starts empty.

GitHub Pages is built by `.github/workflows/deploy.yml`. In repository **Settings → Pages**, choose **GitHub Actions** as the source.

## Add a new resource

Upload files to the appropriate folder described in [schools/README.md](schools/README.md), or use:

```sh
python3 scripts/add-resource.py /path/to/file.pdf --school "School name" --subject "Physics" --year 12 --type exams --exam-year 2026
```

Commit the new files to `main`. The catalogue and website rebuild automatically. The helper preserves the source file, checks exact duplicates, and adds metadata.

## Run locally

```sh
python3 scripts/build-catalog.py
python3 -m http.server 8000 --directory _site
```

Only new files explicitly added to `schools/` appear in this website. Unconfirmed school origins remain labelled **School not confirmed**. A publisher is not treated as a school.

No reuse licence is granted over uploaded school resources by this repository. Each resource retains its original ownership.
