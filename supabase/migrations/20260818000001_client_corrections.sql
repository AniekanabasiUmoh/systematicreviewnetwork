-- Client corrections, August 2026.
--
-- Fortune Effiong reviewed the live site and supplied replacement copy for the
-- homepage, About page and all five programmes, plus a set of content changes
-- that were never carried over from the old WordPress site. This migration
-- applies the parts that live in the database; the parts that live in TSX are
-- in the same commit.
--
-- Every statement is row-targeted (`where <natural key>`). The scripts that
-- previously wrote this content — supabase/seed.mjs and real-content.mjs —
-- deleted whole tables and re-inserted, which would silently destroy anything
-- staff had edited through the admin. They are archived in supabase/_archive/;
-- see the README there. Do not reintroduce that pattern.

-- ── Partners ──────────────────────────────────────────────────────────────
-- The client asked for UNILAG to come off the "supported by" bar, and for
-- AuthorAID to be shown under its current name. AuthorAID rebranded to Rising
-- Scholars; the old site's own footer already read "Our Partners: Rising
-- Scholars, INASP". The logo file is still the AuthorAID one — a replacement
-- has been requested. Shipping the rename now rather than holding the UNILAG
-- removal behind an asset: a stale logo is a smaller error than displaying a
-- partner the client has disowned.
delete from partners where name = 'University of Lagos';

update partners
set name = 'Rising Scholars',
    url  = 'https://www.risingscholars.net'
where name = 'AuthorAID';

-- ── Homepage ──────────────────────────────────────────────────────────────
-- Item 1: "SRN" in brackets after the full name. Item 3: a subheading that
-- covers policymakers, not only researchers.
update homepage
set hero_eyebrow = 'Systematic Reviews Network (SRN)',
    hero_subheading = 'We build capacity for systematic reviews and meta-analyses across low- and middle-income countries, training researchers and supporting policymakers to generate, interpret, and apply evidence that stands up to scrutiny and informs real decisions.'
where id = true;

-- ── Programmes ────────────────────────────────────────────────────────────
-- Replacement intros, verbatim from the client where supplied.

update programmes
set intro = 'The Beginner Academy takes you from a first, answerable question to a clear plan for a systematic review. It builds the foundations plainly, with guidance from people who do this work. No prior review experience is assumed.'
where slug = 'beginner-academy';

-- The Practical Course runs in April and November only, so "apply" set the
-- wrong expectation: there is usually no open intake to apply to. `interest`
-- routes to the same form but frames it as registering to be told when the
-- next one opens, which is what the client asked for.
update programmes
set duration  = 'Varies',
    format    = 'Virtual',
    cta_kind  = 'interest',
    cta_label = 'Register your interest',
    intro     = 'The Practical Course is for researchers who are past the basics and into the work. It runs twice a year, in April and November. Register your interest and we will tell you when the next intake opens, and what it will cover.'
where slug = 'practical-course';

update programmes
set intro = 'The Mentorship Programme pairs researchers with experienced reviewers throughout a live review process, helping them make confident methodological decisions from protocol development to final synthesis. Applications are open to mentees, mentors, and librarians.'
where slug = 'mentorship';

update programmes
set intro = 'The Webinar Series brings methods and evidence into the open through short, focused live sessions on the questions reviewers and evidence users actually face. Sessions are free to attend, recorded for those who miss them, and designed to support better evidence production, interpretation, and use.'
where slug = 'webinar-series';

update programmes
set intro   = 'Institutional Training brings SRN to your department, faculty, programme, or policy team. We work with you to scope a curriculum around your people, their priorities, and the evidence decisions they need to make. The programme is delivered where it is needed and designed to leave lasting capacity behind, helping teams produce, interpret, adapt, and apply systematic review evidence with greater confidence.',
    for_who = '["Universities and research institutes","Government agencies and policy teams","Programmes and funders building evidence synthesis capacity","Departments wanting a cohort trained together","Institutions seeking to strengthen evidence use in research, policy, programming, or implementation"]'::jsonb
where slug = 'institutional-training';

-- ── About page ────────────────────────────────────────────────────────────
-- Retitled "About us" per the client, and rebuilt around the text they
-- supplied. Vision, mission and values are restored from the old WordPress
-- site (wordpress-export/inventory.json, page `about-us`), which the new site
-- had never carried over.
--
-- Two typos in the old site's own copy are fixed here rather than reproduced:
-- "Passsion" -> "Passion", "Diverty" -> "Diversity and Inclusion".
--
-- "Evidence co-adaptation" under What we do is new in the client's text; it is
-- the policymaker-facing half of the work the site previously never described.
update pages
set title = 'About us',
    body_rich = '{
  "type": "doc",
  "content": [
    { "type": "paragraph", "content": [ { "type": "text", "text": "Systematic Reviews Network (SRN), formerly known as the African Community for Systematic Reviews and Meta-analyses (ACSRM), is a registered charity established to support the production, dissemination, and use of systematic reviews and meta-analyses across low- and middle-income countries (LMICs). SRN is incorporated as a company limited by guarantee and registered in Nigeria, while operating across Africa and other LMICs through capacity-building programmes, research collaborations, and knowledge-sharing activities. SRN was officially launched on 8 December 2022 at the University of Rwanda, Rwanda, and on 19 December 2022 at the University of Lagos, Nigeria, through seed funding received from the International Network for Advancing Science and Policy (INASP)." } ] },

    { "type": "heading", "attrs": { "level": 2 }, "content": [ { "type": "text", "text": "Our vision" } ] },
    { "type": "paragraph", "content": [ { "type": "text", "text": "To bridge evidence gaps in LMICs and transform lives by guiding decisions with robust, context-specific evidence." } ] },

    { "type": "heading", "attrs": { "level": 2 }, "content": [ { "type": "text", "text": "Our mission" } ] },
    { "type": "bulletList", "content": [
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "text": "To empower researchers from academia and research institutions, especially early-career researchers, with the skills, tools, and resources needed to successfully conduct systematic reviews and meta-analyses." } ] } ] },
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "text": "To empower systematic review users, including scientists, government agencies, expert panels, patients, policymakers and health-care advocates, with the knowledge and skills needed to critique, understand, interpret and use systematic reviews and meta-analyses." } ] } ] },
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "text": "To cooperate and work with partners, stakeholders, research institutions, and academic institutions to promote and improve the use and production of systematic reviews and meta-analyses." } ] } ] }
    ] },

    { "type": "heading", "attrs": { "level": 2 }, "content": [ { "type": "text", "text": "What we do" } ] },
    { "type": "paragraph", "content": [ { "type": "text", "text": "SRN builds capacity for systematic reviews and meta-analyses in settings where that capacity is scarce. We work with researchers, institutions, and policymakers to strengthen how evidence is produced, interpreted, adapted, and used in real decisions. We do this in several ways:" } ] },
    { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Training: " }, { "type": "text", "text": "Structured courses that take researchers from a clear, answerable question through to a completed review, while also helping policymakers understand how to interpret and use review evidence." } ] },
    { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Mentorship: " }, { "type": "text", "text": "Pairing researchers with experienced reviewers through the full process of a live review, so methodological choices are made with guidance rather than guesswork." } ] },
    { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Evidence co-adaptation: " }, { "type": "text", "text": "Working with policymakers and other decision-makers to interpret review findings, adapt evidence to local contexts, and turn research into practical options for policy, programming, and implementation." } ] },
    { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Open resources: " }, { "type": "text", "text": "Guides, templates, and recorded sessions, freely available to anyone, because good methods should not sit behind a paywall." } ] },

    { "type": "heading", "attrs": { "level": 2 }, "content": [ { "type": "text", "text": "Why it matters" } ] },
    { "type": "paragraph", "content": [ { "type": "text", "text": "A systematic review answers a clear question by finding and appraising the relevant studies with explicit, reproducible methods. Every decision is documented, so another researcher can follow the same steps and reach the same place. That is what separates a review from an opinion, and it is why reviews carry weight in policy and practice." } ] },
    { "type": "paragraph", "content": [ { "type": "text", "text": "The skills to produce and use that evidence are unevenly distributed. Where they are scarce, decisions get made on weaker grounds, and the questions that matter most locally are the least likely to have been reviewed at all. Building the capacity in place, rather than importing conclusions drawn elsewhere, is the work." } ] },

    { "type": "heading", "attrs": { "level": 2 }, "content": [ { "type": "text", "text": "Our values" } ] },
    { "type": "bulletList", "content": [
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Passion. " }, { "type": "text", "text": "We have a sense of enthusiasm for our work and for the people around us." } ] } ] },
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Teamwork. " }, { "type": "text", "text": "We operate on the principle of teamwork because we believe people are capable of building something bigger than themselves when they unite." } ] } ] },
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Integrity. " }, { "type": "text", "text": "Everyone who represents our team is committed to acting in a way that is consistent with our values." } ] } ] },
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Accountability. " }, { "type": "text", "text": "We accept responsibility for our actions and inactions, because it is the best way to build trust internally and externally." } ] } ] },
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Quality. " }, { "type": "text", "text": "We uphold the highest standards, because how well an organisation crafts its goods and services determines how successful it is." } ] } ] },
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Diversity and inclusion. " }, { "type": "text", "text": "We prosper by integrating a variety of backgrounds and experiences into a setting where everyone has an equal opportunity." } ] } ] },
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Collaboration. " }, { "type": "text", "text": "We understand the importance of evidence in shaping practice in the global community, so we promote working with different stakeholders towards achieving this aim." } ] } ] },
      { "type": "listItem", "content": [ { "type": "paragraph", "content": [ { "type": "text", "marks": [ { "type": "bold" } ], "text": "Equity. " }, { "type": "text", "text": "We are determined to ensure fairness in all that we do at all times." } ] } ] }
    ] }
  ]
}'::jsonb
where slug = 'about';

-- ── Impact ────────────────────────────────────────────────────────────────
-- "Programmes run" was ambiguous — the client could not tell what it counted.
-- Renamed to the thing it actually measures, with their figure.
update impact_stats
set label = 'Mentorship programmes run',
    value = '4'
where label = 'Programmes run';

-- ── Academy ───────────────────────────────────────────────────────────────
-- Held closed while the facilitation team writes the course content. Done as a
-- migration rather than an admin click so the decision is recorded and applies
-- to every environment. /academy no longer reads this table at all, but an
-- unpublished course also stops /academy/systematic-review-methodology from
-- being reachable by a shared link.
update courses
set status = 'draft'
where slug = 'systematic-review-methodology';

-- ── Testimonials ──────────────────────────────────────────────────────────
-- These two were drafted as placeholders during the content pass and attributed
-- to "Workshop participant" and "Mentorship participant". They read as genuine
-- participant quotes and are not. The client flagged this twice and is sourcing
-- real ones. Every surface that renders testimonials already guards on there
-- being any, so removing them degrades cleanly.
delete from testimonials
where name in ('Workshop participant', 'Mentorship participant');
