/* Phase 5.3 — a YouTube recording is an external resource, not a downloadable
   file. Empty Tiptap documents are also cleared so the public renderer cannot
   mistake a recording for an unfinished article. */
update resources
set external_url = file_url,
    file_url = null,
    body_rich = null,
    updated_at = now()
where slug = 'systematicreviewsforbeginners'
  and file_url is not null
  and external_url is null;
