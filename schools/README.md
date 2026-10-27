# School resource folders

This collection starts empty and accepts new uploads only.

Store files as `schools/school-name/subject/year-12/exams/filename.pdf`.

Supported resource folders: `exams`, `solutions`, `assessments`, `powerpoints`, `worksheets`, `lessons`, `programs`, `other`.

Use `schools/school-name/_school.json` to keep the school's official name:

```json
{"name":"School name","shortName":"Optional initials","location":"Optional location"}
```

Optional file metadata goes in `filename.pdf.metadata.json` alongside the file:

```json
{"title":"Semester 1 examination","subject":"Physics","yearLevel":"12","type":"Exams","examYear":"2026"}
```

Put resources without a verified school in `schools/unconfirmed/`. Do not infer a school from a publisher or an ambiguous abbreviation.

Every commit rebuilds the catalogue and website. Identical file contents are listed once, with any extra stored paths recorded in the duplicate report.
