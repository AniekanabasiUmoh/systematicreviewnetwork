/* Sprint 6.9 — the demonstration course.
 *
 * Real prose on systematic review methodology, written to exercise every part
 * of 6.2–6.7: multiple modules, drip release, a video embed, downloadable
 * materials, an auto-marked quiz, a marked assignment, and a certificate at
 * the end.
 *
 * IT SHIPS AS A DRAFT COHORT AND IS NEVER PUBLISHED. Design.md §6.9 is explicit
 * about why: the content reads like the real thing so Fortune can judge how the
 * Academy feels, but it has not been reviewed by SRN's academics, and a
 * certificate from it would carry SRN's name. Realism is for the demo's sake
 * and must not become an un-reviewed credential going out under SRN's brand.
 *
 * The course_status and cohort status below are therefore 'draft', and the
 * admin marks it clearly. Do not "helpfully" publish it.
 */

const p = (text) => ({ type: "paragraph", content: [{ type: "text", text }] });

const h = (level, text) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const bullets = (items) => ({
  type: "bulletList",
  content: items.map((text) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  })),
});

const numbered = (items) => ({
  type: "orderedList",
  content: items.map((text) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  })),
});

const quote = (text) => ({
  type: "blockquote",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

const doc = (...nodes) => ({ type: "doc", content: nodes });

export const COURSE = {
  slug: "demo-systematic-review-methodology",
  title: "Systematic Review Methodology",
  summary:
    "How to plan, run and report a systematic review that another researcher could repeat. Six modules covering the question, the search, screening, appraisal, synthesis and reporting.",
  level: "introductory",
  delivery: "online",
  duration_label: "Six weeks, around four hours a week",
  learning_outcomes: [
    "Turn a broad research interest into an answerable review question",
    "Build and document a search strategy another researcher could rerun",
    "Screen records against explicit criteria without introducing bias",
    "Appraise the risk of bias in the studies you include",
    "Decide honestly whether a meta-analysis is appropriate",
    "Report a review so that a reader can judge how much to trust it",
  ],
  prerequisites: [
    "No previous review experience needed",
    "Some familiarity with reading research papers is helpful",
  ],
  body_rich: doc(
    p(
      "A systematic review answers one question by finding every relevant study, appraising each one, and drawing the findings together in a way somebody else could check. That last part is what separates it from an ordinary literature review: the method is written down before the work starts, and reported in enough detail that another team could repeat it and get the same answer.",
    ),
    p(
      "This course walks through a full review from the first vague question to a finished report. It is built around the decisions that actually cause trouble — where to set an inclusion boundary, what to do when two screeners disagree, when pooling results would mislead rather than clarify.",
    ),
    h(2, "How the course runs"),
    p(
      "Six modules, each with a short set of lessons and a practical exercise. Modules open one at a time so the work stays in order — you will not be reading about synthesis before you have a set of studies to synthesise.",
    ),
    p(
      "There is a quiz at the end of module two and a marked assignment at the end of module four. Both must be passed to receive a certificate.",
    ),
  ),
};

export const MODULES = [
  {
    title: "1. Asking a question worth answering",
    summary:
      "Most reviews that go wrong went wrong here. Turning an interest into a question with a defensible boundary.",
    release_rule: "immediate",
    lessons: [
      {
        title: "What a systematic review is, and is not",
        estimated_minutes: 25,
        summary:
          "The distinction that governs everything else: a protocol written before the work, and a method reported so it can be repeated.",
        body: doc(
          p(
            "A literature review surveys what has been written. A systematic review answers a specific question by locating every study that could bear on it, judging each one against criteria set in advance, and reporting the whole process so a reader can see what was done.",
          ),
          p(
            "The word doing the work is systematic. It does not mean thorough, or careful, or large. It means the method was decided before the results were seen, and it was written down.",
          ),
          h(2, "Why the order matters"),
          p(
            "If you decide which studies to include after you have read them, you will — without meaning to — include the ones that agree with you. This is not dishonesty; it is how judgement works when it is not constrained. Writing the criteria first is what constrains it.",
          ),
          quote(
            "A protocol is a promise to your future self that you will not move the goalposts once you can see where the ball landed.",
          ),
          h(2, "What this buys you"),
          bullets([
            "A reader can judge how much to trust the conclusion, because they can see how it was reached",
            "Another team can repeat the review and check whether they get the same answer",
            "You can defend a decision that turned out to be inconvenient, because it was made before you knew it would be",
          ]),
          p(
            "None of this makes a review true. It makes it checkable, which is the most any piece of research can offer.",
          ),
        ),
      },
      {
        title: "From interest to answerable question",
        estimated_minutes: 30,
        summary:
          "PICO and its relatives — and what to do when your question does not fit any of them.",
        body: doc(
          p(
            "“Does exercise help depression?” is an interest, not a question. It has no population, no comparison, and no stated outcome, so there is no way to decide whether a given study is relevant.",
          ),
          h(2, "PICO"),
          p(
            "The most common framework breaks a question into four parts. It suits questions about whether an intervention works.",
          ),
          bullets([
            "Population — who, specifically? Adults with a clinical diagnosis, or anyone reporting low mood?",
            "Intervention — what exactly is being done, at what dose or intensity?",
            "Comparison — compared with what? No treatment, usual care, or a different intervention?",
            "Outcome — measured how, and when?",
          ]),
          p(
            "Applied to the question above: in adults with a diagnosis of major depressive disorder, does supervised aerobic exercise, compared with usual care, reduce depression severity at twelve weeks as measured by a validated scale?",
          ),
          p(
            "That version is longer and much less satisfying to say out loud. It is also answerable, which the first version was not.",
          ),
          h(2, "When PICO does not fit"),
          p(
            "Plenty of good questions are not about interventions. A review of how a condition is experienced, or of what methods a field uses, has no comparison and often no outcome in the PICO sense. Forcing it into the framework produces a worse question, not a better one.",
          ),
          p(
            "Alternatives exist — SPIDER for qualitative work, PEO for exposure questions — but the underlying requirement never changes: whatever structure you use, someone reading your criteria must be able to pick up a paper and decide whether it belongs.",
          ),
        ),
      },
      {
        title: "Writing the protocol",
        estimated_minutes: 20,
        summary:
          "What goes in it, and why registering it publicly is worth the inconvenience.",
        body: doc(
          p(
            "The protocol states what you will do before you do it. At minimum it covers the question, the inclusion and exclusion criteria, where you will search, how you will screen, how you will appraise quality, and how you plan to synthesise the results.",
          ),
          h(2, "Registration"),
          p(
            "PROSPERO registers protocols for reviews with a health-related outcome. Registration is free, takes an afternoon, and does two things: it timestamps your intentions, and it lets other teams see that the review is under way before they duplicate it.",
          ),
          p(
            "It also makes deviations visible. That feels like a cost until you need to explain why the final review differs from the plan — at which point a registered protocol showing exactly what changed, and when, is considerably stronger than a claim that nothing did.",
          ),
          h(2, "Deviating from the protocol"),
          p(
            "You will deviate. Searches turn up study designs you had not anticipated; an outcome you planned to pool turns out to be measured five incompatible ways. Deviating is not a failure. Deviating silently is.",
          ),
          p(
            "Record what changed, when, and why — and report it in the final paper. A review that says “we planned to pool these outcomes but abandoned it because the measures were not comparable” is more trustworthy than one where the pooling simply never appears.",
          ),
        ),
      },
    ],
  },
  {
    title: "2. Finding the evidence",
    summary:
      "Building a search that another researcher could rerun and get the same records.",
    release_rule: "after_previous",
    lessons: [
      {
        title: "Choosing databases",
        estimated_minutes: 20,
        summary:
          "Why one database is never enough, and which ones matter for African health research.",
        body: doc(
          p(
            "No single database indexes everything. MEDLINE and Embase overlap heavily but neither contains the other, and both under-index research published outside North America and Europe.",
          ),
          h(2, "A reasonable starting set"),
          bullets([
            "MEDLINE (via PubMed) — free, broad biomedical coverage",
            "Embase — stronger on European and pharmacological literature",
            "The Cochrane Library — trials and existing reviews",
            "African Journals Online (AJOL) — essential for African research that the major indexes miss",
            "Google Scholar — poor for systematic searching, useful for chasing citations",
          ]),
          p(
            "For a review concerning African populations, treating AJOL and regional indexes as optional is a methodological weakness, not a resourcing decision. A review that searched only MEDLINE and concluded “little evidence exists” may only have demonstrated where it did not look.",
          ),
          h(2, "Grey literature"),
          p(
            "Theses, government reports and trial registries hold findings that never reached a journal — and studies with unwelcome results are less likely to be published at all. Ignoring grey literature does not make a review neutral; it tilts it toward positive findings.",
          ),
        ),
      },
      {
        title: "Building the search string",
        estimated_minutes: 35,
        summary:
          "Concept blocks, controlled vocabulary, truncation — and testing before you trust it.",
        body: doc(
          p(
            "A search string is built one concept at a time. Take each element of your question, gather every reasonable way it might be described, and join those with OR. Then join the concept blocks with AND.",
          ),
          h(2, "Free text and controlled vocabulary"),
          p(
            "Databases index articles with controlled terms — MeSH in MEDLINE, Emtree in Embase. These catch papers regardless of the authors' wording, but they are applied by human indexers, imperfectly and with a lag. Recent papers may not be indexed yet.",
          ),
          p(
            "So use both: controlled terms for reliability, free-text terms for coverage. Searching only MeSH will miss last month's paper entirely.",
          ),
          h(2, "Truncation and proximity"),
          p(
            "Truncation catches word endings — child* finds child, children, childhood. Use it deliberately: an over-eager truncation can pull in an entire unrelated literature, and cat* is the classic example.",
          ),
          h(2, "Testing the search"),
          p(
            "Before running it properly, pick three or four papers you already know should be included. If your search does not return them, it is wrong, and running it anyway will produce a review with a hole in it.",
          ),
          p(
            "This step takes twenty minutes and catches errors that would otherwise surface after screening two thousand records.",
          ),
        ),
      },
      {
        title: "Recording what you did",
        estimated_minutes: 15,
        summary:
          "The search log, and why an exact date matters.",
        body: doc(
          p(
            "For every database, record the platform, the exact string, the date you ran it, any limits applied, and the number of records returned.",
          ),
          p(
            "The date matters more than it looks. Databases grow continuously; a search run in March and one run in June return different results. Without the date, a reader cannot tell whether a discrepancy is an error or simply time passing.",
          ),
          h(2, "Reporting it"),
          p(
            "The full strategy for at least one database belongs in the paper, usually as an appendix. Reviewers ask for it because a review whose search cannot be inspected cannot be assessed — and increasingly, journals will not publish one without it.",
          ),
        ),
      },
    ],
    quiz: {
      title: "Check your understanding: questions and searching",
      pass_mark: 60,
      max_attempts: null,
      questions: [
        {
          prompt:
            "You plan to pool two outcomes, but the studies measure them in incompatible ways. What should the final review say?",
          explanation:
            "Deviations are expected. Reporting them is what keeps the review trustworthy — a silent deviation looks like a result that was never planned for.",
          options: [
            { label: "Report the deviation and explain why the plan changed", correct: true },
            { label: "Pool them anyway and note the limitation in the discussion" },
            { label: "Remove the outcomes from the protocol so the paper is consistent" },
            { label: "Say nothing — the protocol is a plan, not a commitment" },
          ],
        },
        {
          prompt:
            "A review of maternal health in West Africa searches only MEDLINE and Embase and finds little evidence. What is the most likely problem?",
          explanation:
            "The major indexes under-cover African research. AJOL and regional databases are not optional extras for this question.",
          options: [
            {
              label: "The search missed regional literature that those databases do not index",
              correct: true,
            },
            { label: "The question was too narrow to return many records" },
            { label: "Two databases is too few for any review" },
            { label: "The date limits were probably set incorrectly" },
          ],
        },
        {
          prompt: "Why search free-text terms as well as controlled vocabulary?",
          explanation:
            "Indexing is done by people, imperfectly and after a delay. Free text catches what indexing has not reached yet.",
          options: [
            {
              label: "Recent papers may not be indexed with controlled terms yet",
              correct: true,
            },
            { label: "Free-text searching returns results faster" },
            { label: "Controlled vocabulary is being phased out" },
            { label: "Journals require both to be reported" },
          ],
        },
        {
          prompt: "What is the point of testing a search against papers you already know?",
          explanation:
            "If a search cannot find studies you know belong, it is broken. Twenty minutes here saves discovering it after screening thousands of records.",
          options: [
            {
              label: "To confirm the search actually finds studies that should be included",
              correct: true,
            },
            { label: "To estimate how many records screening will involve" },
            { label: "To check the database subscription is active" },
            { label: "To decide whether the question needs narrowing" },
          ],
        },
      ],
    },
  },
  {
    title: "3. Screening and selection",
    summary:
      "Getting from several thousand records to the studies you will actually read.",
    release_rule: "after_previous",
    lessons: [
      {
        title: "Two screeners, and what to do when they disagree",
        estimated_minutes: 25,
        summary:
          "Independent duplicate screening, and why disagreement is a feature.",
        body: doc(
          p(
            "Two people screen every record independently, then compare. This is not a courtesy to the second person — one screener working alone makes consistent mistakes and has no way to notice.",
          ),
          h(2, "Disagreement is information"),
          p(
            "A high disagreement rate usually means the criteria are ambiguous, not that one screener is careless. It is worth stopping to rewrite the criteria rather than pressing on and resolving case by case.",
          ),
          p(
            "Agree in advance how disagreements are settled — usually discussion, with a third reviewer for anything unresolved. Deciding this beforehand stops it becoming a negotiation about individual papers.",
          ),
          h(2, "Title and abstract, then full text"),
          p(
            "Screen titles and abstracts first, generously: at this stage the cost of wrongly including something is one full-text read, while the cost of wrongly excluding it is a missing study nobody will ever notice.",
          ),
          p(
            "At full text, record the reason for every exclusion. The PRISMA flow diagram requires those counts, and reconstructing them afterwards is miserable.",
          ),
        ),
      },
      {
        title: "The PRISMA flow diagram",
        estimated_minutes: 20,
        summary: "What the numbers mean and why they must add up.",
        body: doc(
          p(
            "The flow diagram tracks records from the raw search results to the studies included, showing what was removed at each stage and why.",
          ),
          numbered([
            "Records identified — the raw count from every source, before anything is removed",
            "Duplicates removed — the same paper found in more than one database",
            "Records screened on title and abstract, with the number excluded",
            "Full texts assessed, with exclusions grouped by reason",
            "Studies included in the review, and in any meta-analysis",
          ]),
          p(
            "The numbers must reconcile. A reader who adds them and finds a discrepancy will assume — reasonably — that other numbers in the paper may not be reliable either.",
          ),
        ),
      },
    ],
  },
  {
    title: "4. Appraising what you found",
    summary:
      "Risk of bias, and what it means for a study to be well conducted rather than merely well written.",
    release_rule: "after_previous",
    lessons: [
      {
        title: "Risk of bias in randomised trials",
        estimated_minutes: 30,
        summary: "The domains that matter and how to judge them from a paper.",
        body: doc(
          p(
            "Risk of bias asks whether a study's design and conduct could have produced a wrong answer. It is separate from whether the study is large, recent, or published somewhere prestigious.",
          ),
          h(2, "The domains"),
          bullets([
            "Randomisation — was the allocation sequence genuinely random and concealed until assignment?",
            "Deviations from intended interventions — did people receive what they were assigned?",
            "Missing outcome data — who dropped out, and could their absence change the result?",
            "Measurement of the outcome — could knowing the assignment have influenced how it was assessed?",
            "Selective reporting — were the outcomes reported the ones that were planned?",
          ]),
          h(2, "Judging from a paper"),
          p(
            "Papers frequently do not say. “Patients were randomised” tells you nothing about concealment. Where a paper is silent, record it as unclear rather than assuming the best — and consider writing to the authors, who often answer.",
          ),
          quote(
            "A poorly reported study is not necessarily a poorly conducted one. But you can only assess what you can see.",
          ),
        ),
      },
      {
        title: "Extracting data consistently",
        estimated_minutes: 25,
        summary: "The extraction form, and piloting it before you rely on it.",
        body: doc(
          p(
            "Data extraction pulls the same fields from every study: design, setting, participants, intervention detail, outcomes and results. Doing it in duplicate catches transcription errors, which are far more common than anyone expects.",
          ),
          h(2, "Pilot the form"),
          p(
            "Run the extraction form on three or four studies first. You will find fields you did not anticipate and fields that turn out to mean different things in different papers. Fixing the form after twenty extractions means redoing twenty extractions.",
          ),
        ),
      },
    ],
    assignment: {
      title: "Appraise a study",
      pass_mark: 60,
      max_attempts: 3,
      submission_type: "either",
      instructions: doc(
        p(
          "Choose a randomised trial in your own field — one you can access in full — and appraise its risk of bias using the domains covered in this module.",
        ),
        h(2, "What to submit"),
        p("Around 600 to 800 words, or a completed appraisal table. Cover:"),
        numbered([
          "The full reference of the study you chose",
          "Your judgement for each domain: low risk, high risk, or unclear",
          "The specific text in the paper that supports each judgement, quoted or cited by page",
          "An overall judgement, with your reasoning",
          "One thing the paper should have reported and did not",
        ]),
        h(2, "How it is marked"),
        p(
          "The judgements themselves are not what is being assessed — reasonable people disagree. What is assessed is whether each judgement is grounded in something the paper actually says, and whether you distinguished “the study did not do this” from “the paper does not say whether the study did this”. That distinction is the whole skill.",
        ),
      ),
    },
  },
  {
    title: "5. Synthesis",
    summary:
      "Bringing findings together — and deciding honestly when a meta-analysis would mislead.",
    release_rule: "after_previous",
    lessons: [
      {
        title: "Should you pool at all?",
        estimated_minutes: 30,
        summary:
          "Heterogeneity, and why a narrative synthesis is often the more honest answer.",
        body: doc(
          p(
            "A meta-analysis combines results into a single estimate. It is powerful when the studies are asking the same question of similar populations, and misleading when they are not.",
          ),
          h(2, "Heterogeneity"),
          p(
            "Statistical heterogeneity — commonly summarised as I² — measures how much the results vary beyond chance. But the statistic follows the judgement, not the other way round: if the studies differ clinically, in population or intervention or outcome definition, pooling them produces a number that answers no question anybody asked.",
          ),
          quote(
            "The question is not whether you can pool these studies. It is whether the pooled number would mean anything.",
          ),
          h(2, "Narrative synthesis"),
          p(
            "Where pooling is not appropriate, describe the studies systematically: what was found, in whom, with what certainty, and where the findings agree or conflict. This is not a lesser option. A clear narrative synthesis is more useful than a forest plot that averages incomparable things.",
          ),
        ),
      },
      {
        title: "Reading a forest plot",
        estimated_minutes: 25,
        summary: "What each element shows, and the common misreadings.",
        body: doc(
          p(
            "A forest plot shows each study's effect estimate and confidence interval, with the pooled estimate at the bottom. Marker size reflects the weight each study carries.",
          ),
          h(2, "Common misreadings"),
          bullets([
            "A wide confidence interval crossing the line of no effect means uncertainty, not proof of no effect",
            "A large pooled effect from studies at high risk of bias is a large biased effect",
            "Studies scattered on both sides of the line are telling you something the pooled number is hiding",
          ]),
        ),
      },
    ],
  },
  {
    title: "6. Reporting",
    summary:
      "Writing the review so a reader can judge how much to trust it.",
    release_rule: "after_previous",
    lessons: [
      {
        title: "PRISMA and what it is for",
        estimated_minutes: 20,
        summary:
          "A reporting checklist, not a quality score — and the difference matters.",
        body: doc(
          p(
            "PRISMA lists what a systematic review should report. It is a reporting guideline: following it does not make a review good, it makes a review assessable.",
          ),
          p(
            "That distinction gets lost. A review can tick every PRISMA item and still be built on a poor search. What PRISMA guarantees is that a reader can see the poor search rather than having to guess at it.",
          ),
          h(2, "Where reviews commonly fall short"),
          bullets([
            "The full search strategy is not reproduced for any database",
            "Exclusions at full text are counted but not grouped by reason",
            "Deviations from the protocol are not mentioned",
            "Risk of bias is assessed but never referred to again in the conclusions",
          ]),
          p(
            "The last one is the most consequential. Assessing bias and then drawing conclusions as though every study were sound wastes the assessment entirely.",
          ),
        ),
      },
      {
        title: "Writing the conclusion",
        estimated_minutes: 20,
        summary: "Saying what the evidence supports, and no more.",
        body: doc(
          p(
            "The conclusion should follow from the synthesis and stop there. Two failures are common and opposite.",
          ),
          h(2, "Overreaching"),
          p(
            "Four small trials at high risk of bias do not support a recommendation for practice. They support a statement that the evidence is limited and of uncertain quality.",
          ),
          h(2, "Retreating"),
          p(
            "“More research is needed” is almost always true and almost never useful. If the evidence does support something, say so. If more research is needed, say what kind, in whom, measuring what — that is a finding, and it is actionable.",
          ),
          p(
            "A good conclusion tells a reader what to do differently on Monday, or tells them honestly that the evidence cannot yet say.",
          ),
        ),
      },
    ],
  },
];

export const COHORT = {
  label: "Demonstration cohort",
  slug: "demo-cohort",
  pacing: "cohort_paced",
  price_kobo: 0,
  currency: "NGN",
  capacity: 30,
  // NEVER 'published'. See the note at the top of this file.
  status: "draft",
};
