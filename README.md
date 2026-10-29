# School Assessment Library

A separate assessment repository and website for school exams, tests, assessment tasks and marking guides, organised by **subject → year group → school → assessment**. Existing Learning Vault files have not been copied or moved.

## Website

The website provides search, school browsing, subject and year filters, resource type filters, file details, download links, and bookmarks saved on each visitor's device. The catalogue includes uploaded files under `assessments/` and legacy `schools/` folders.

GitHub Pages is built by `.github/workflows/deploy.yml`. In repository **Settings → Pages**, choose **GitHub Actions** as the source.

## Add a new assessment

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

Upload using `assessments/Subject/11/School name/Task name/document.docx` (years 1–12), or the legacy `schools/` layout. Nested task folders are supported. Exact duplicates within a subject, year and school are consolidated. Metadata and Office lock files are ignored. PDFs and media previews are hosted with the website. Word and Office originals use repository download links and Microsoft Office previews to keep the published site within hosting limits. Unconfirmed school origins remain labelled **School not confirmed**. A publisher is not treated as a school.

No reuse licence is granted over uploaded school resources by this repository. Each resource retains its original ownership.

## Displayed assessment names

Displayed names use the exact original filename, including its extension, punctuation, dates and version numbers. Automatic document-heading extraction and OCR renaming are disabled because guessed titles can misidentify assessments. Explicit `.metadata.json` titles take priority when supplied by the owner. Original filenames remain searchable. File paths, downloads, bookmarks and duplicate handling are preserved. Old generated-name caches are ignored. `title-report.json` records the naming policy and sources.
