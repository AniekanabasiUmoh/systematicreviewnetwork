/* The real SRN Beginner Academy curriculum, transcribed from the client's
 * draft (new/SRNAcademy2026Draft.docx.md, 6449 lines) into the shape
 * lib/actions/admin-curriculum.ts and the lessons/assessments schema expect.
 *
 * WHERE THIS COMES FROM AND WHAT CHANGED IN THE TRANSCRIPTION.
 *
 * The source document is real, reviewed course content with named academic
 * contributors (Prof Ejaz Ahmad Khan, Prof F. E. Afolabi Lessi, Dr Uhawenimana
 * Thierry Claudien, and others per module) — not draft/placeholder prose. The
 * text below is that content, restructured to fit the database, not rewritten.
 * Three mechanical adjustments were necessary:
 *
 * 1. TABLES. The rich-text sanitizer (lib/admin/richtext.ts) does not allow a
 *    table node — only doc/paragraph/heading/bulletList/orderedList/listItem/
 *    blockquote/text/image/embed. Every comparison table in the source (e.g.
 *    Module 1's systematic-vs-scoping-vs-narrative-vs-rapid-vs-bibliometric
 *    table) is reproduced here as a heading per item with a bullet list of its
 *    row values, in the same order, with nothing added or dropped.
 *
 * 2. ASCII-ART DIAGRAMS. The source uses arrows and box-drawing characters
 *    (STUDY 1 \ STUDY 2 ──► REVIEW ──► EVIDENCE) that do not render as
 *    intended outside a fixed-width font. These are converted to a short
 *    ordered list of the same steps, preserving the sequence, not paraphrased.
 *
 * 3. QUIZ QUESTIONS. The schema's quiz_options table requires multiple-choice
 *    options with one marked correct — it has no field for a free-text or
 *    true/false answer key. The source mixes real multiple-choice questions
 *    (lettered A/B/C/D options) with open-ended ones ("Why should you check
 *    existing reviews before starting?" with a written answer, no options).
 *    Only genuine lettered multiple-choice questions become quiz_questions
 *    here. Open-ended and true/false questions are kept as read-only
 *    self-check content inside the relevant lesson's body (question, then the
 *    source's own answer beneath it) rather than dropped or invented into a
 *    false multiple-choice shape.
 *
 * "PAGE n — Title" markers in the source become h(2, "Title") inside the
 * owning lesson's body_rich — the schema has no separate page/block table
 * (see supabase/migrations/20260727000003_curriculum.sql), so a lesson's
 * pages are concatenated into one document, in source order.
 *
 * Module 2's Practice section and every module's Project Task became a
 * per-module assignment (kind: 'assignment'), instructions written out as
 * rich text — the schema has no structured multi-field submission form, so
 * the learner submits one free-text response covering every field the source
 * asks for, as the assignment instructions lay out.
 */

const t = (text) => ({ type: "text", text });
const b = (text) => ({ type: "text", marks: [{ type: "bold" }], text });
const i = (text) => ({ type: "text", marks: [{ type: "italic" }], text });

const p = (...parts) => ({
  type: "paragraph",
  content: parts.map((x) => (typeof x === "string" ? t(x) : x)),
});

const h = (level, text) => ({
  type: "heading",
  attrs: { level },
  content: [t(text)],
});

/* A list item is a string (plain text), an array of inline parts (mixed
 * bold/italic/plain text forming one paragraph), or an already-built node
 * (e.g. a nested paragraph) — accept all three shapes so callers can mix
 * plain bullets with bold-lead-in bullets in the same list. */
const listItemContent = (item) => {
  if (typeof item === "string") return p(item);
  if (Array.isArray(item)) return p(...item);
  return item;
};

const bullets = (items) => ({
  type: "bulletList",
  content: items.map((item) => ({
    type: "listItem",
    content: [listItemContent(item)],
  })),
});

const numbered = (items) => ({
  type: "orderedList",
  content: items.map((item) => ({
    type: "listItem",
    content: [listItemContent(item)],
  })),
});

const quote = (text) => ({
  type: "blockquote",
  content: [p(text)],
});

const doc = (...nodes) => ({ type: "doc", content: nodes.flat() });

/* A self-check question kept in the lesson body rather than the graded quiz
 * table — used for the source's open-ended / true-false items (see note 3
 * above). Rendered as a bold question, its options if any, then the answer. */
const selfCheck = (question, answer, options) => [
  p(b(question)),
  ...(options ? [bullets(options)] : []),
  p(i("Answer: "), answer),
];

/* One row of a source table, reproduced as "Column: value" bullet lines under
 * a heading named for the row's subject (see note 1 above). */
const tableItem = (subject, pairs) => [
  h(3, subject),
  bullets(pairs.map(([col, val]) => `${col}: ${val}`)),
];

/* An uploaded image node — src must already be a public URL under the
 * project's `media` storage bucket (see lib/admin/richtext.ts's sanitizer
 * allowlist for src). Used for the three diagrams embedded in the source
 * document (see supabase/upload-academy-diagrams.mjs). */
const image = (src, alt) => ({ type: "image", attrs: { src, alt } });
const caption = (text) => ({
  type: "paragraph",
  content: [{ type: "text", marks: [{ type: "italic" }], text }],
});

/* NEXT_PUBLIC_SUPABASE_URL must be set wherever this file is imported for
 * seeding (see supabase/seed-srn-academy.mjs, which loads .env before this
 * module is imported). */
const MEDIA_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/storage/v1/object/public/media`;

export const COURSE = {
  slug: "systematic-review-methodology",
  title: "Beginner Academy: Systematic Review Methodology",
  summary:
    "Seven modules taking a first-time reviewer from an interest to a registrable review protocol: question, eligibility criteria, search, screening, extraction, and the protocol itself.",
  level: "introductory",
  delivery: "online",
  duration_label: "Seven modules, self-paced",
  learning_outcomes: [
    "Recognise a systematic review and explain how it differs from a narrative review",
    "Turn a broad research interest into a focused, answerable question using PICO and related frameworks",
    "Write inclusion and exclusion criteria that different reviewers can apply consistently",
    "Build and document a systematic literature search across multiple databases",
    "Screen records against explicit criteria, in duplicate, with disagreements resolved and reported",
    "Extract study data into a piloted form without guessing at missing information",
    "Assemble a complete, registrable systematic review protocol from your own work in the course",
  ],
  prerequisites: [
    "No previous review experience needed",
    "You will build your own review project module by module as you go",
  ],
  body_rich: doc(
    p(
      "This is the SRN Beginner Academy: a seven-module course that takes you from a first, vague interest in a topic to a systematic review protocol you could actually register.",
    ),
    p(
      "Each module builds on the last. You will not just read about the process: a running project task in every module has you apply what you learned to a review of your own choosing, so that by the end you have worked through the real stages rather than only studied them.",
    ),
    h(2, "How the course runs"),
    p(
      "Module 1 gives you the map before the journey: what a systematic review is, and why it matters. From Module 2 on, each module covers one stage of the process (the question, the eligibility criteria, the search, screening, and extraction) with worked examples, activities, and a module quiz. Module 7 brings everything you have built together into one protocol document.",
    ),
    image(
      `${MEDIA_BASE}/academy-six-step-overview.png`,
      "A six-icon overview: define the research question, identify inclusion and exclusion criteria, identify and assess relevant research, apply inclusion and exclusion criteria, analyse data, and interpret and write up findings.",
    ),
    caption("The shape of a systematic review, start to finish: from the SRN facilitator materials."),
  ),
};

export const MODULE_1 = {
  title: "1. Understanding Systematic Reviews",
  summary:
    "Before you learn how to conduct a systematic review, you need to understand what you are actually trying to do.",
  release_rule: "immediate",
  contributors: [
    "Prof Ejaz Ahmad Khan",
    "Prof F. E. Afolabi Lessi",
    "Dr Uhawenimana Thierry Claudien",
  ],
  lessons: [
    {
      title: "1.1 What Is a Systematic Review?",
      estimated_minutes: 15,
      summary:
        "A systematic review is research about research: a structured way of bringing together evidence from existing studies to answer one specific question.",
      body: doc(
        h(2, "Welcome"),
        p(b("What is a systematic review?")),
        p(
          'You have probably heard the words "systematic review" and "meta-analysis" before. But what exactly do they mean?',
        ),
        p(
          "A systematic review is not simply a paper that discusses several studies. It is a structured form of research that brings together evidence from existing studies to answer a specific research question.",
        ),
        p(b("A systematic review is research about research.")),
        numbered([
          "Individual studies (Study 1, Study 2, Study 3, Study 4, Study 5…)",
          "are brought together by a systematic review",
          "into evidence brought together to answer one question",
        ]),
        h(2, "Research About Research"),
        p("Imagine that you want to answer this question:"),
        p(b("Does exercise improve sleep quality among university students?")),
        p(
          "You search the literature and find several studies. One study says exercise improves sleep. Another finds a small improvement. Another finds no clear improvement. And there may be many other studies you have not yet found.",
        ),
        p("So what should you do?"),
        p(
          "You could simply read a few papers and give your opinion. But that would not tell you whether you have found all the relevant evidence, or whether the studies you selected provide a fair picture of the evidence.",
        ),
        p("A systematic review takes a structured approach. It asks:"),
        numbered([
          "What exactly is our question?",
          "Which studies should we include?",
          "How will we find the relevant studies?",
          "How will we decide which studies are eligible?",
          "How will we assess the studies?",
          "How will we bring their findings together?",
        ]),
        p(
          "The purpose is to produce a carefully structured summary of the available evidence that can help answer the question.",
        ),
        numbered([
          "Question: does exercise improve sleep?",
          "Find: relevant studies",
          "Select: eligible studies",
          "Assess: study quality / risk of bias",
          "Synthesise: bring evidence together",
          "Answer: what does the evidence tell us?",
        ]),
        h(2, "A More Formal Definition"),
        p("Now that you understand the basic idea, let's make the definition more precise."),
        p(
          "A systematic review is a form of research that uses explicit and systematic methods to identify relevant evidence, assess the studies that are found, and synthesise their findings to answer a specific question.",
        ),
        p("The important words are:"),
        bullets([
          [b("Specific question: "), t("a systematic review should be designed around a clearly defined question.")],
          [b("Explicit methods: "), t("the researchers should explain what they planned to do.")],
          [b("Systematic search: "), t("the evidence should be sought using a structured approach.")],
          [b("Critical appraisal: "), t("the included studies should be assessed appropriately.")],
          [b("Synthesis: "), t("the findings are brought together to answer the review question.")],
        ]),
        p(
          "Don't worry if some of these terms are new to you. We will learn exactly what searching, eligibility, critical appraisal, data extraction and synthesis mean in later modules.",
        ),
        h(2, "Check Your Understanding"),
        ...selfCheck(
          "Which of these best describes a systematic review?",
          "B: a study that systematically identifies, assesses and synthesizes relevant research to answer a specific question.",
          [
            "A. A paper in which a researcher gives their personal opinion about a research topic.",
            "B. A study that systematically identifies, assesses and synthesizes relevant research to answer a specific question.",
            "C. A single experiment conducted by researchers.",
            "D. A list of interesting papers about a particular subject.",
          ],
        ),
        p(
          "A systematic review uses a structured process to identify and synthesize relevant evidence around a specific research question.",
        ),
      ),
    },
    {
      title: "1.2 Why Do We Need Systematic Reviews?",
      estimated_minutes: 12,
      summary:
        "Thousands of studies are published every year. Systematic reviews bring the relevant evidence together for the people who need to use it.",
      body: doc(
        h(2, "The Evidence Problem"),
        p(b("There is a lot of research.")),
        p(
          "Every year, researchers publish thousands of studies. New evidence is constantly being added to what we already know.",
        ),
        p("This creates a problem:"),
        p(b("How do we make sense of all this evidence?")),
        p(
          "A healthcare professional may not have the time to find and critically assess every study about a particular treatment. A policymaker may need to make a decision using evidence from many different studies. A researcher may need to know what has already been established before starting a new study.",
        ),
        p("Systematic reviews help bring relevant evidence together."),
        h(2, "Who Uses the Evidence?"),
        p("Systematic reviews are not conducted simply because researchers like reading papers. They can help people make decisions."),
        bullets([
          [b("Patients: "), t("what treatment options are supported by the available evidence?")],
          [b("Clinicians: "), t("what does the existing evidence suggest about best practice?")],
          [b("Pharmacists: "), t("what evidence can inform decisions about medicines and drug policies?")],
          [b("Policymakers: "), t("what does the evidence suggest when decisions must be made with limited resources?")],
          [b("Researchers: "), t("what has already been studied, and where are the gaps?")],
          [b("Research funders: "), t("is there already sufficient evidence, or is more research needed?")],
        ]),
        h(2, "A Systematic Review Can Turn Many Studies Into One Evidence Picture"),
        numbered([
          "Study 1, Study 2, Study 3, Study 4, Study 5,",
          "brought into a systematic review,",
          "which produces evidence.",
        ]),
        p(
          "A systematic review does not magically make individual studies disappear. Instead, it provides a structured way of bringing relevant studies together.",
        ),
        p("The goal is to move from:"),
        p(i('"What does this one study say?"')),
        p("to:"),
        p(i('"What does the body of relevant evidence tell us about this question?"')),
        h(2, "Activity: Who Needs This Review?"),
        p(b("Scenario")),
        p(
          "A government is considering whether to introduce a new educational intervention nationally. Several studies have already investigated whether the intervention works. Who could benefit from a systematic review of this evidence?",
        ),
        ...selfCheck(
          "Who could benefit from a systematic review of this evidence?",
          "All of the above.",
          ["A policymaker", "A teacher", "A researcher", "All of the above"],
        ),
      ),
    },
    {
      title: "1.3 Systematic Review vs Narrative Review vs Scoping vs Rapid",
      estimated_minutes: 15,
      summary:
        "Narrative, systematic, scoping, rapid, and bibliometric reviews are not the same thing: each answers a different kind of question with a different method.",
      body: doc(
        h(2, "Different Ways of Reviewing Literature"),
        p(
          "Researchers can review existing literature in different ways. Terms you will encounter frequently are: narrative review, systematic review, scoping review, rapid review, and bibliometric analysis. They are not the same thing.",
        ),
        p(
          "A narrative review may discuss and summarise literature around a topic without using the same structured and explicitly documented process expected of a systematic review. A systematic review follows a planned and transparent methodology for identifying, selecting, assessing and synthesising evidence.",
        ),
        h(2, "Compare Them"),
        tableItem("Systematic review", [
          ["Main purpose", "Answer a focused research question"],
          ["Typical question", '"Does X affect Y?"'],
          ["Scope", "Usually focused"],
          ["Search", "Systematic and predefined"],
          ["Eligibility criteria", "Predefined"],
          ["Critical appraisal", "Usually important/expected according to review type"],
          ["Data extracted", "Study characteristics and relevant outcome data"],
          ["Synthesis", "Narrative and/or statistical"],
          ["Meta-analysis", "Sometimes"],
          ["Main output", "Evidence-based answer"],
          ["Best suited for", "Focused evidence questions"],
        ]),
        tableItem("Scoping review", [
          ["Main purpose", "Map the breadth, concepts and evidence in a field"],
          ["Typical question", '"What evidence exists about X?"'],
          ["Scope", "Usually broader"],
          ["Search", "Systematic and predefined"],
          ["Eligibility criteria", "Predefined"],
          ["Critical appraisal", "Generally not the primary purpose"],
          ["Data extracted", "Characteristics and concepts of the evidence"],
          ["Synthesis", "Descriptive mapping/charting and sometimes other synthesis"],
          ["Meta-analysis", "Usually not the main purpose"],
          ["Main output", "Map of evidence"],
          ["Best suited for", "Broad/emerging fields and evidence gaps"],
        ]),
        tableItem("Rapid review", [
          ["Main purpose", "Provide evidence efficiently under time/resource constraints"],
          ["Typical question", '"What does the evidence say about X, quickly?"'],
          ["Scope", "Often focused"],
          ["Search", "Systematic but streamlined"],
          ["Eligibility criteria", "Predefined, often streamlined"],
          ["Critical appraisal", "Often streamlined or adapted"],
          ["Data extracted", "Data needed to answer the urgent question"],
          ["Synthesis", "Streamlined synthesis"],
          ["Meta-analysis", "Sometimes"],
          ["Main output", "Timely evidence for decision-making"],
          ["Best suited for", "Urgent decisions"],
        ]),
        tableItem("Narrative review", [
          ["Main purpose", "Describe, explain or discuss literature around a topic"],
          ["Typical question", '"What is known about X?"'],
          ["Scope", "Can be broad"],
          ["Search", "May be less structured"],
          ["Eligibility criteria", "May be less explicit"],
          ["Critical appraisal", "Usually not formal"],
          ["Data extracted", "Key information relevant to the narrative"],
          ["Synthesis", "Narrative discussion"],
          ["Meta-analysis", "Usually not"],
          ["Main output", "Conceptual/narrative account"],
          ["Best suited for", "Background, context and broad discussion"],
        ]),
        tableItem("Bibliometric analysis", [
          ["Main purpose", "Quantitatively analyse the publication/citation landscape"],
          ["Typical question", '"How has research on X developed?"'],
          ["Scope", "Often broad"],
          ["Search", "Structured retrieval of bibliographic records"],
          ["Eligibility criteria", "Defined according to bibliometric dataset/objective"],
          ["Critical appraisal", "Usually not the same type of study-level quality appraisal"],
          ["Data extracted", "Publication, citation, author, keyword and network data"],
          ["Synthesis", "Quantitative bibliometric/statistical and network analyses"],
          ["Meta-analysis", "No"],
          ["Main output", "Research landscape/maps/trends"],
          ["Best suited for", "Understanding research production, impact and structure"],
        ]),
        h(2, "Activity: Which Review Is Systematic?"),
        p(b("Scenario A")),
        p(
          "Amaka wants to write about the effects of social media on students. She searches Google and reads several papers she finds interesting. She selects papers that discuss the issue from different perspectives and writes a summary.",
        ),
        p(b("Scenario B")),
        p(
          "David wants to determine whether social media use is associated with depression among university students. He defines his eligibility criteria before searching, searches specified databases using a documented strategy, screens the retrieved studies against his criteria and assesses the included studies.",
        ),
        ...selfCheck(
          "Which scenario is more consistent with a systematic review?",
          "B: Scenario B. Scenario B describes a predefined question, explicit eligibility criteria, a documented search and structured study selection.",
          ["A. Scenario A", "B. Scenario B", "C. Both equally", "D. Neither"],
        ),
      ),
    },
    {
      title: '1.4 What Makes a Review "Systematic"?',
      estimated_minutes: 15,
      summary:
        "Five words to remember: explicit, systematic, transparent, reproducible, unbiased.",
      body: doc(
        h(2, "Five Words to Remember"),
        p("A systematic review should be:"),
        numbered(["Explicit", "Systematic", "Transparent", "Reproducible", "Unbiased"]),
        h(2, "1. Explicit"),
        p(
          "A systematic review should clearly state what the researchers intend to do. The reader should be able to understand:",
        ),
        bullets([
          "What is the research question?",
          "What studies are eligible?",
          "How will the evidence be searched for?",
          "How will studies be assessed?",
          "How will information be extracted?",
          "How will the findings be analysed?",
        ]),
        p(
          'You should not have to guess what the reviewers did. Explicit = "Tell me exactly what you did."',
        ),
        h(2, "2. Systematic"),
        p("The review should follow a planned and structured process. Instead of:"),
        p(i('"I found some papers and selected the ones I liked."')),
        p(
          "the researcher should have a systematic approach for identifying and selecting relevant evidence. Later in this academy, you will learn how to build this process yourself.",
        ),
        p(b("Plan → Search → Screen → Assess → Extract → Synthesize")),
        p("rather than a pile of randomly selected papers."),
        h(2, "3. Transparent"),
        p("A reader should be able to understand how decisions were made. For example:"),
        bullets([
          "Why was this study included?",
          "Why was another study excluded?",
          "Which databases were searched?",
          "When was the search conducted?",
          "What criteria were used?",
        ]),
        p(
          "Transparency allows other researchers to examine the process rather than simply accepting the final conclusion.",
        ),
        h(2, "4. Reproducible"),
        p(
          "The methods should be reported clearly enough that another researcher can understand and, where appropriate, reproduce the approach. For example, a researcher should not simply write:",
        ),
        p(i('"We searched the literature."')),
        p(
          "They should provide enough information about the search for readers to understand what was actually done.",
        ),
        p(b("A conclusion without a clear method is difficult to evaluate.")),
        h(2, "5. Unbiased"),
        p(
          "A systematic review should aim to minimise avoidable bias in the review process. For example, reviewers should not deliberately select only studies that support the conclusion they already want.",
        ),
        p(
          "The methods used to identify, select and assess evidence should help protect the review from avoidable subjectivity.",
        ),
        bullets([
          "Predefined criteria → consistent decisions",
          "Personal preference → selective decisions",
        ]),
        h(2, "Mini Challenge"),
        p(b("Scenario")),
        p(
          "A reviewer finds 30 studies. After reading them, she decides to include only the 12 studies whose findings support her hypothesis. She does not report the other 18 studies or explain why they were excluded.",
        ),
        ...selfCheck(
          "Which principle is most clearly violated?",
          "C: Both A and B. The reviewer's decisions were not transparently reported and were not based on an adequately predefined systematic selection process.",
          ["A. Transparency", "B. Systematic approach", "C. Both A and B", "D. Neither"],
        ),
      ),
    },
    {
      title: "1.5 The Systematic Review Journey",
      estimated_minutes: 10,
      summary:
        "The ten stages a review moves through, from research question to reporting and publication: the map before the journey.",
      body: doc(
        h(2, "From Question to Publication"),
        p(
          "You have learned what a systematic review is and what makes it systematic. But what does the whole process look like?",
        ),
        p("At the highest level, a systematic review moves through several stages."),
        numbered([
          "Research question",
          "Review team",
          "Protocol",
          "Search",
          "Study selection",
          "Critical appraisal",
          "Data extraction",
          "Synthesis",
          "Interpretation",
          "Reporting & publication",
        ]),
        h(2, "Don't Worry About All Those Words Yet"),
        p(
          'You may be looking at this list and thinking: "I don\'t know what half of these things mean." That\'s completely fine. You are not expected to know how to do them yet.',
        ),
        p(
          "This module is about understanding the big picture. The rest of the SRN Beginner Academy will take you through these stages one at a time. For example:",
        ),
        bullets([
          [b("Module 2: "), t("how to turn an idea into a research question")],
          [b("Module 3: "), t("how to develop your protocol")],
          [b("Module 4: "), t("how to search for the evidence")],
          [b("Module 5: "), t("how to screen studies")],
        ]),
        p(b("Think of Module 1 as learning the map before starting the journey.")),
        h(2, "What Happens During the Review?"),
        bullets([
          [b("Question: "), t("what do we want to know?")],
          [b("Search: "), t("where is the evidence?")],
          [b("Screen: "), t("which studies belong?")],
          [b("Appraise: "), t("how trustworthy are the included studies?")],
          [b("Extract: "), t("what information do the studies contain?")],
          [b("Synthesise: "), t("what does the evidence collectively show?")],
          [b("Report: "), t("what did we find, and what does it mean?")],
        ]),
      ),
    },
  ],
  quiz: {
    title: "Module 1 Challenge",
    pass_mark: 60,
    max_attempts: null,
    questions: [
      {
        prompt: "Which statement best describes a systematic review?",
        explanation:
          "A systematic review systematically identifies, assesses and synthesises relevant evidence to answer a specific question.",
        options: [
          { label: "A summary of papers selected because they are interesting" },
          {
            label:
              "Research that systematically identifies, assesses and synthesises relevant evidence to answer a specific question",
            correct: true,
          },
          { label: "A single primary research study" },
          { label: "A commentary on a research topic" },
        ],
      },
      {
        prompt:
          "Which characteristic means that the methods and decisions of a systematic review should be clearly reported?",
        explanation:
          "Transparency allows other researchers to examine the process rather than simply accepting the conclusion.",
        options: [
          { label: "Transparency", correct: true },
          { label: "Randomisation" },
          { label: "Blinding" },
          { label: "Generalisation" },
        ],
      },
      {
        prompt:
          "Which of the following is an important difference between a systematic review and a narrative review?",
        explanation:
          "Systematic reviews use predefined and explicitly reported methods for identifying and selecting evidence; a meta-analysis is not required.",
        options: [
          { label: "Systematic reviews always contain a meta-analysis" },
          {
            label:
              "Systematic reviews use predefined and explicitly reported methods for identifying and selecting evidence",
            correct: true,
          },
          { label: "Narrative reviews cannot contain references" },
          { label: "Narrative reviews are never useful" },
        ],
      },
      {
        prompt: "Which stage normally comes first?",
        explanation:
          "The research question anchors everything else that follows in the review.",
        options: [
          { label: "Data extraction" },
          { label: "Risk-of-bias assessment" },
          { label: "Formulation of the research question", correct: true },
          { label: "Meta-analysis" },
        ],
      },
      {
        prompt: "Why do systematic reviews bring together evidence from multiple studies?",
        explanation:
          "The purpose is a structured synthesis of relevant evidence around a question, not a replacement for primary research.",
        options: [
          { label: "To replace all primary research" },
          {
            label: "To provide a structured synthesis of relevant evidence around a question",
            correct: true,
          },
          { label: "To guarantee that every study has the same result" },
          { label: "To avoid reading the original studies" },
        ],
      },
      {
        prompt:
          "Scenario: a researcher searches one database, selects studies based on personal judgement and does not report why some studies were excluded. What is the biggest methodological concern?",
        explanation:
          "Undocumented, judgement-based selection is exactly what transparency and a systematic approach are meant to prevent.",
        options: [
          { label: "The study has too many references" },
          {
            label: "The review process lacks transparency and systematic study selection",
            correct: true,
          },
          { label: "The researcher used too many databases" },
          { label: "The researcher performed a meta-analysis" },
        ],
      },
      {
        prompt:
          "Scenario: you have found 100 papers about a topic. Before beginning the search, you define which populations, interventions, outcomes and study designs will be eligible. What is the main advantage of doing this?",
        explanation:
          "Predefined criteria give reviewers a consistent, defensible basis for every inclusion and exclusion decision.",
        options: [
          { label: "It makes every study eligible" },
          {
            label: "It provides predefined criteria for making study-selection decisions",
            correct: true,
          },
          { label: "It guarantees that the review will have a meta-analysis" },
          { label: "It removes the need to read abstracts" },
        ],
      },
    ],
  },
  assignment: {
    title: "Your SRN Review Project: Stage 1",
    pass_mark: 60,
    max_attempts: null,
    submission_type: "text",
    instructions: doc(
      p(
        "Throughout this academy, you will gradually build a systematic review project. Each module will help you complete one part of the process. By the end of the academy, you will have worked through the major stages of a systematic review rather than simply reading about them.",
      ),
      h(2, "Task 1: Choose Your Area of Interest"),
      p(
        "Think of an area of research that interests you: health, nursing, medicine, public health, education, psychology, engineering, social sciences, or another field. For now, do not try to formulate a perfect research question. Simply identify the broad area you are interested in.",
      ),
      p(
        i(
          'Example: "Mental health among university students", "Renewable energy adoption", "Nurse-led interventions in palliative care".',
        ),
      ),
      p(b("Write your area of interest.")),
      h(2, "Task 2: Why Are You Interested?"),
      p(
        "In 2–3 sentences, explain what you would like to know about this area. Don't worry about using PICO or any other framework yet: just explain the problem or uncertainty in your own words.",
      ),
      h(2, "Task 3: Is a Systematic Review Potentially Useful?"),
      p("Answer yes / no / I don't know yet for each:"),
      numbered([
        "Is there already research on this topic?",
        "Do you think there may be multiple studies that could be brought together?",
        "Is there an unanswered or unclear question that you would like to investigate?",
      ]),
      p(
        "Don't worry if you answered \"I don't know.\" One purpose of the next modules is to help you determine whether your idea can become a useful systematic review question.",
      ),
    ),
  },
};

export const MODULE_2 = {
  title: "2. Developing Your Topic and Research Question",
  summary:
    "A systematic review begins with a question. Before you search, screen, or extract data, you need to know exactly what you are trying to find.",
  release_rule: "after_previous",
  contributors: ["Prof Ejaz Khan", "Dr Carlos Andrade", "Emmanuel Ekpor"],
  lessons: [
    {
      title: "2.1 From an Idea to a Review Topic",
      estimated_minutes: 12,
      summary:
        "Most reviews begin with an idea, not a perfectly formed question. Your topic is where you start; your research question is where you need to arrive.",
      body: doc(
        h(2, "Every Review Starts Somewhere"),
        p(b("Where does a systematic review topic come from?")),
        p(
          "Most systematic reviews do not begin with a perfectly formed research question. They begin with an idea.",
        ),
        p(
          "Perhaps you noticed a problem in your work. Perhaps you read two studies that reached different conclusions. Perhaps something in your field is changing. Perhaps you noticed that researchers have studied a topic extensively, but an important part of the picture is still unclear.",
        ),
        p("Your starting point might be:"),
        bullets([
          "a problem in practice",
          "an uncertainty",
          "a recurring pattern",
          "a gap in knowledge",
          "conflicting findings",
          "a population whose needs are not well understood",
          "an emerging issue",
          "an area where existing evidence needs updating or further examination",
        ]),
        p(b("Your topic is where you start. Your research question is where you need to arrive.")),
        h(2, "Topic ≠ Research Question"),
        numbered([
          "Broad idea: mental health in university students",
          "Narrower topic: physical activity and mental health among university students",
          "Focused question: among university students, does regular physical activity, compared with no or lower physical activity, improve depressive symptoms?",
        ]),
        p("A topic describes the general area you want to investigate. A research question tells us precisely what you want the review to answer. For example:"),
        p(b("Topic: "), t("Online learning: this is far too broad to guide a systematic review.")),
        p(b("Narrower topic: "), t("Online learning and academic performance among university students.")),
        p(
          b("Question: "),
          t(
            "Among university students, does online learning, compared with face-to-face learning, affect academic performance?",
          ),
        ),
        p(
          "The topic gives you a direction. The question gives your review a target. The topic and research question therefore form the foundation of the review. A poorly defined question can lead to an unfocused search, irrelevant studies, and weak synthesis.",
        ),
      ),
    },
    {
      title: "2.2 Is Your Topic Worth Reviewing?",
      estimated_minutes: 12,
      summary:
        "An interesting topic is not automatically a good systematic review topic. FINER (feasible, interesting, novel, ethical, relevant) helps you check before committing months of work.",
      body: doc(
        h(2, "Not Every Interesting Topic Makes a Good Review"),
        p(
          "An interesting topic is not automatically a good systematic review topic. Before investing months of work, you need to ask: is this topic worth reviewing?",
        ),
        p(b("A useful starting framework is FINER:")),
        bullets([
          [
            b("F: Feasible. "),
            t(
              "Can the review realistically be conducted? Consider the amount of available literature, your time, your skills, access to databases, and available resources.",
            ),
          ],
          [
            b("I: Interesting. "),
            t(
              "Are you genuinely interested in the question? You may spend considerable time reading, screening and analysing studies. The question needs to hold your attention.",
            ),
          ],
          [
            b("N: Novel. "),
            t(
              "Has the question already been adequately answered? You need to investigate what reviews already exist.",
            ),
          ],
          [
            b("E: Ethical. "),
            t(
              "Are there ethical considerations associated with the question and how the evidence will be handled? For evidence synthesis, ethical concerns may be less prominent than in primary research, but the issue should still be considered.",
            ),
          ],
          [
            b("R: Relevant. "),
            t(
              "Will the answer matter? A useful review can contribute to practice, policy, research, theory or decision-making.",
            ),
          ],
        ]),
        h(2, "Three Questions About Your Topic"),
        numbered([
          "Is there a problem or uncertainty? What don't we know?",
          "Is there enough evidence? Are there studies that could potentially be brought together?",
          "Is there a reason to do the review? Why would the answer matter?",
        ]),
        h(2, "A Preliminary Check"),
        p(
          "Before committing to your topic, you need to look briefly at the existing literature. This is not your systematic search yet: at this stage, you are exploring. You want to understand:",
        ),
        bullets([
          "What has already been studied?",
          "What kinds of studies exist?",
          "Are there already systematic or scoping reviews?",
          "Is there an obvious gap?",
          "Is the topic too broad?",
          "Is there enough evidence to make a review worthwhile?",
        ]),
        p(
          b("Do not confuse a preliminary search with your final systematic search. "),
          t("We will teach the proper systematic search later."),
        ),
      ),
    },
    {
      title: "2.3 From Topic to Research Question",
      estimated_minutes: 15,
      summary:
        "A good question is clear, focused, specific, answerable, relevant, and feasible. Too broad, too narrow, and vague-outcome questions are the three common failure modes.",
      body: doc(
        h(2, "Your Research Question Is the Anchor"),
        p(
          "Once you have a worthwhile topic, the next step is to formulate your research question. Your research question tells the entire review what it is trying to answer. It influences what studies are eligible, what you search for, what information you extract, how you analyse the evidence, and ultimately what conclusions you can draw.",
        ),
        p(b("Question → Search → Selection → Extraction → Analysis → Answer")),
        p("If the question is unclear, everything downstream becomes harder."),
        h(2, "What Makes a Good Question?"),
        p("A good systematic review question should be:"),
        bullets([
          [b("Clear: "), t("a reader should understand what you are asking.")],
          [b("Focused: "), t("it should not attempt to answer everything about a topic.")],
          [b("Specific: "), t("the important concepts should be identifiable.")],
          [b("Answerable: "), t("the available evidence should be capable of addressing it.")],
          [b("Relevant: "), t("the answer should have a reason to matter.")],
          [b("Feasible: "), t("the review should be realistic to conduct.")],
        ]),
        h(2, "Too Broad"),
        p(b("Example: "), t("What are the effects of exercise on health?")),
        p(
          "This looks like a research question. But it is enormous. What exercise? Who? What health outcome? Compared with what?",
        ),
        p("How could we narrow it? We might specify:"),
        bullets([
          "Population: university students",
          "Intervention/exposure: regular physical activity",
          "Outcome: depressive symptoms",
        ]),
        p("Now we are moving towards a reviewable question."),
        h(2, "Too Narrow"),
        p(
          b("Now consider: "),
          t("Does 20 minutes of yoga at 7 AM reduce back pain in pregnant Finnish women over 40 years?"),
        ),
        p(
          "This is the opposite problem. There may be very few studies, or none, that meet all those restrictions.",
        ),
        p(b("Remember: "), t("too broad → too much evidence. Too narrow → too little evidence.")),
        p("Your goal is to find the useful middle ground."),
        h(2, "Vague Outcomes"),
        p(b("Consider: "), t("Does meditation improve mental health?")),
        p('What exactly is "mental health"?'),
        bullets(["anxiety?", "depression?", "stress?", "psychological distress?", "wellbeing?"]),
        p(
          "The outcome needs enough definition to allow studies to be identified, data to be extracted and findings to be synthesised.",
        ),
        p(
          b("Better: "),
          t("Does mindfulness meditation reduce anxiety symptoms among university students?"),
        ),
        p("Now we know much more about what the review is looking for."),
      ),
    },
    {
      title: "2.4 Using PICO, and Knowing When PICO Is Not Enough",
      estimated_minutes: 15,
      summary:
        "PICO breaks a question into Population, Intervention, Comparator, Outcome. It suits effectiveness questions: other question types need PEO, PIRD, PCC, or another framework entirely.",
      body: doc(
        h(2, "PICO"),
        p(
          "One of the most commonly used frameworks for developing a focused review question is PICO. Think of PICO as a checklist that helps you identify the essential parts of your question.",
        ),
        bullets([
          [
            b("P: Population. "),
            t("Who are you interested in? Examples: adults with insomnia; university students; patients with diabetes."),
          ],
          [
            b("I: Intervention. "),
            t(
              "What intervention, exposure or issue are you investigating? Examples: cognitive behavioural therapy; a mindfulness programme; online learning.",
            ),
          ],
          [
            b("C: Comparator. "),
            t(
              "What are you comparing it with? Examples: usual care; no intervention; another treatment. The comparison may sometimes be absent or unnecessary.",
            ),
          ],
          [
            b("O: Outcome. "),
            t(
              "What are you interested in measuring or finding out? Examples: sleep quality; depression symptoms; academic performance.",
            ),
          ],
        ]),
        h(2, "PICO in Practice"),
        tableItem("Example: insomnia", [
          ["P", "Adults with insomnia"],
          ["I", "CBT-I"],
          ["C", "Sleeping medication"],
          ["O", "Sleep quality"],
        ]),
        p(
          b("Question: "),
          t("In adults with insomnia, is CBT-I more effective than sleeping medication at improving sleep quality?"),
        ),
        tableItem("Another example: education", [
          ["P", "9th-grade algebra students"],
          ["I", "Gamified learning platforms"],
          ["C", "Traditional homework"],
          ["O", "Exam scores and engagement"],
        ]),
        p(
          b("Question: "),
          t(
            "For 9th-grade algebra students, does using gamified platforms compared with traditional homework improve exam scores and engagement?",
          ),
        ),
        h(2, "PICO Is Not a Universal Formula"),
        p(b("Do not force every research question into PICO.")),
        p(
          "PICO is particularly useful for questions involving interventions and effectiveness. But systematic reviews can address many other types of questions. Different questions may therefore require different frameworks.",
        ),
        bullets([
          [b("PEO "), t("(Population, Exposure, Outcome): useful for questions concerning exposures, risk or associations.")],
          [
            b("PIRD "),
            t(
              "(Population, Index Test, Reference Test, Diagnosis of Interest): useful for diagnostic test accuracy questions.",
            ),
          ],
          [b("PCC "), t("(Population, Concept, Context): useful for scoping review questions.")],
        ]),
        p(
          b("SRN rule: "),
          t("first understand the question. Then choose the framework. Do not choose the framework first and force your question into it."),
        ),
        h(2, "A Simple Framework Selector"),
        bullets([
          "Does an intervention work? → PICO",
          "Is an exposure associated with an outcome? → PEO",
          "How accurate is a diagnostic test? → PIRD",
          "What is the prevalence/incidence of a condition? → CoCoPop",
          "What are people's experiences or perceptions? → PICo / SPIDER or another appropriate qualitative framework",
          "What evidence exists across a broad field? → PCC for a scoping review",
        ]),
      ),
    },
    {
      title: "2.5 Is Your Question Actually Reviewable?",
      estimated_minutes: 12,
      summary:
        "A question can sound scientific and still be a poor systematic review question. Test it against the too-broad, too-narrow, and reviewability checks, then check whether it's already been answered.",
      body: doc(
        h(2, "Reviewable or Not?"),
        p("A question can sound scientific and still be a poor systematic review question. Let's test three questions."),
        p(b("Question A: "), t("What is the effect of social media on teenagers?")),
        p(i("Too broad.")),
        p("Which social media? Which teenagers? What effect?"),
        p(
          b("Question B: "),
          t(
            "What is the impact of a specific four-week leadership workshop run by Company X in Q3 2024 on the sales team's performance?",
          ),
        ),
        p(i("Too narrow for a systematic review.")),
        p(
          "Why? Because you are asking about one specific programme delivered to one specific group at one specific time. This is much more like a primary research question.",
        ),
        p(
          b("Question C: "),
          t(
            "What is the effect of mandatory diversity and inclusion training programmes in large corporations on self-reported employee bias and hiring outcomes?",
          ),
        ),
        p(i("Much more reviewable.")),
        h(2, "Your Final Question Check"),
        p("Before you move on, ask:"),
        bullets([
          "Is it clear? Can another researcher understand exactly what I mean?",
          "Is it focused? Can I realistically review the evidence within the available time?",
          "Is it answerable? Are there likely to be relevant studies?",
          "Is it relevant? Will the answer matter?",
          "Is it appropriately structured? Have I identified the important components?",
          "Is it sufficiently novel? Has this already been adequately answered?",
        ]),
        h(2, "Before You Commit: Has Someone Already Done It?"),
        p("You have a good question. Don't start the review yet. First ask:"),
        p(b("Has someone already answered this question?")),
        p(
          "An existing systematic review does not automatically mean your project is impossible. You need to investigate:",
        ),
        bullets([
          "Is there already a review?",
          "How recent is it?",
          "Does it answer the same question?",
          "Did it search the same evidence?",
          "Is your population different?",
          "Is your intervention different?",
          "Are new studies available?",
          "Does the existing review have important limitations?",
        ]),
        p(
          "You should consider checking repositories such as PROSPERO, the Cochrane Library, Campbell Collaboration and relevant bibliographic databases before beginning.",
        ),
        p(
          b("Don't spend months answering a question that has already been adequately answered. "),
          t("We will learn how to conduct a proper search for existing reviews later."),
        ),
        h(2, "Check Your Understanding"),
        ...selfCheck(
          'True or false: PICO should be used for every systematic review question.',
          "False. Different questions may require different frameworks.",
        ),
        ...selfCheck(
          "What does the O in PICO represent?",
          "Outcome.",
        ),
        ...selfCheck(
          "Why should you check existing reviews before starting?",
          "To identify whether the question has already been adequately answered and to identify genuine gaps or opportunities for an update/refinement.",
        ),
      ),
    },
  ],
  quiz: {
    title: "Module 2 Quiz",
    pass_mark: 60,
    max_attempts: null,
    questions: [
      {
        prompt: "A topic is:",
        explanation: "A topic is the broad area you want to investigate: narrower than a general idea, broader than a research question.",
        options: [
          { label: "The final research question" },
          { label: "The broad area you want to investigate", correct: true },
          { label: "The search strategy" },
          { label: "The eligibility criteria" },
        ],
      },
      {
        prompt:
          'Scenario: a learner has this question: "Does meditation improve mental health?" What is the biggest problem?',
        explanation: '"Improve mental health" needs to be defined more precisely: the outcome is vague.',
        options: [
          { label: "It has too many outcomes" },
          { label: "The outcome is vague", correct: true },
          { label: "It is too narrow" },
          { label: "It has no population" },
        ],
      },
      {
        prompt: "Which question is most reviewable?",
        explanation:
          "Question C names a population, an intervention, and outcomes precisely enough to guide a search and screening: broad enough to have evidence, narrow enough to be feasible.",
        options: [
          { label: "What is the effect of social media on teenagers?" },
          {
            label: "What is the effect of one specific company's four-week workshop on its employees?",
          },
          {
            label:
              "What is the effect of mandatory diversity training in large corporations on employee bias and hiring outcomes?",
            correct: true,
          },
        ],
      },
    ],
  },
  assignment: {
    title: "Your Review Blueprint: Stage 1",
    pass_mark: 60,
    max_attempts: null,
    submission_type: "text",
    instructions: doc(
      h(2, "Practice: Narrow the Topic"),
      p(
        "Choose one of these broad topics, or your own: mental health in the workplace, online learning, or employee motivation. Complete the following: your broad topic, the population, the intervention/exposure/issue, a possible comparison/context, and the outcome/phenomenon.",
      ),
      h(2, "Practice: Build Your Question"),
      p(
        'Using your answers above, write your first draft: "In ___, does ___ compared with ___ affect ___?" Then ask yourself: is this too broad, too narrow, or about right?',
      ),
      h(2, "Submit: Your Review Blueprint"),
      p("Cover each of the following in your submission:"),
      numbered([
        'Broad topic: e.g. "Online learning among university students".',
        "Review problem/gap: what uncertainty, problem or gap motivated this review?",
        "Framework, which framework are you using: PICO, PEO, PIRD, PCC, or other?",
        "Framework elements: your P, I/E, C, and O (or the equivalent for your chosen framework).",
        "Draft research question.",
        "Why is this question worth reviewing? (100 words maximum.)",
      ]),
    ),
  },
};

export const MODULE_3 = {
  title: "3. Developing Eligibility Criteria",
  summary:
    "You have decided what you want to find out. Now decide exactly how you are going to find it out: the predefined rules for which studies enter your review.",
  release_rule: "after_previous",
  contributors: ["Prof Ejaz Khan", "Dr Leonard Uzairue", "Innocent David"],
  lessons: [
    {
      title: "3.1 What Are Eligibility Criteria?",
      estimated_minutes: 8,
      summary:
        "Eligibility criteria are the predefined rules that determine which studies can and cannot enter the review: decided before you look at results, not after.",
      body: doc(
        p(b("Core idea")),
        p('A systematic review does not simply ask: "Which studies look interesting?" It asks:'),
        p(b('"Which studies meet the rules we established before looking at the results?"')),
        p(
          "Eligibility criteria are the predefined rules that determine which studies can and cannot enter the review.",
        ),
        p(b("Simple analogy")),
        p("Imagine you are organizing a football team. You cannot wait until everyone arrives and then decide:"),
        p(i('"I think I like this player, so I\'ll select him."')),
        p("You establish the rules before selection:"),
        bullets(["age", "position", "fitness", "experience", "etc."]),
        p("Then you apply those rules to everyone. A systematic review works in the same way."),
        p(b("Eligibility criteria are the rules for deciding which studies enter your review.")),
      ),
    },
    {
      title: "3.2 Inclusion vs Exclusion Criteria",
      estimated_minutes: 8,
      summary:
        "Inclusion criteria tell us what qualifies; exclusion criteria tell us what disqualifies. Don't invent exclusion criteria just to make the table look complete.",
      body: doc(
        h(2, "Inclusion criteria"),
        p("These describe the characteristics a study must have to be eligible. For example:"),
        bullets([
          "Adults aged ≥18 years",
          "diagnosed with type 2 diabetes",
          "receiving the intervention of interest",
          "in a randomised controlled trial",
        ]),
        h(2, "Exclusion criteria"),
        p("These describe characteristics that make a study ineligible. For example:"),
        bullets(["Studies involving children.", "Studies involving type 1 diabetes only.", "Case reports."]),
        h(2, "Important SRN principle"),
        p(b("Inclusion criteria tell us what qualifies. Exclusion criteria tell us what disqualifies.")),
        p(
          b("Do not create unnecessary exclusion criteria simply to make the table look complete. "),
          t("If a study fails an inclusion criterion, it is already ineligible."),
        ),
      ),
    },
    {
      title: "3.3 Why Do Eligibility Criteria Matter?",
      estimated_minutes: 8,
      summary:
        "Poor eligibility criteria dilute the evidence base, exclude important studies by accident, and leave reviewers making subjective decisions.",
      body: doc(
        p("Poor eligibility criteria can cause three major problems:"),
        numbered([
          "Irrelevant studies enter: your evidence base becomes diluted.",
          "Important studies are accidentally excluded: your conclusions become incomplete.",
          "Reviewers make subjective decisions: different reviewers may interpret the same study differently.",
        ]),
        p("Well-designed criteria therefore improve:"),
        bullets(["focus", "relevance", "validity", "reproducibility", "efficiency", "and reduction of selection bias"]),
        h(2, "The central principle"),
        p(b("If your eligibility criteria are vague, your study selection will be vague.")),
        p("And if your study selection is inconsistent, your systematic review is no longer truly systematic."),
      ),
    },
    {
      title: "3.4 Start With Your Research Question",
      estimated_minutes: 8,
      summary:
        "Eligibility criteria come from the research question: they should not be invented independently. PICOS is where this becomes useful.",
      body: doc(
        p(b("The eligibility criteria should come from the research question. "), t("They should not be invented independently.")),
        p(b("Research question: "), t("among adults with insomnia, is cognitive behavioural therapy more effective than usual care in improving sleep quality?")),
        p("Now break it down:"),
        bullets([
          "Population: who?",
          "Intervention: what is being studied?",
          "Comparator: compared with what?",
          "Outcome: what are we measuring?",
          "Study design: what types of studies will be eligible?",
        ]),
        p("This is where PICOS becomes particularly useful."),
      ),
    },
    {
      title: "3.5 PICO(S) → Eligibility Criteria: Population",
      estimated_minutes: 8,
      summary:
        "A population criterion should be precise enough that two reviewers would reach the same decision: age, diagnosis, severity, comorbidities, setting.",
      body: doc(
        p(b("P: Population")),
        p(b("Who must the studies investigate?")),
        p('Do not stop at "Adults." You may need to define:'),
        bullets(["age", "diagnosis", "disease stage/severity", "relevant comorbidities", "demographic characteristics where relevant", "setting"]),
        p(
          'You will need to move from the broad "Adults with heart disease" to the much more precise: adults aged 50–75 years with stable coronary artery disease defined by angiography.',
        ),
        p(b("Beginner lesson: "), t("a population criterion should be precise enough that two reviewers would reach the same decision.")),
      ),
    },
    {
      title: "3.6 PICO(S) → Eligibility Criteria: Intervention or Exposure",
      estimated_minutes: 6,
      summary: "Define type, dose, frequency, duration, route, timing, and components, not just \"exercise.\"",
      body: doc(
        p(b("I: Intervention or Exposure")),
        p(b("What exactly must the study investigate?")),
        p(
          'Instead of "Exercise," you might specify: supervised aerobic exercise training for at least 30 minutes, three times per week, for at least 12 weeks.',
        ),
        p("Depending on the question, define:"),
        bullets(["type", "dose", "frequency", "duration", "route", "timing", "components"]),
      ),
    },
    {
      title: "3.7 PICO(S) → Eligibility Criteria: Comparator",
      estimated_minutes: 6,
      summary: "Possible comparators, and why the comparator does not always have to be present.",
      body: doc(
        p(b("C: Comparator")),
        p(b("What must the intervention be compared against?")),
        p("Possible comparators include:"),
        bullets(["placebo", "usual/standard care", "no intervention", "wait-list", "another intervention", "another dose or formulation"]),
        p(b("Important: "), t("the comparator does not always have to be present. Whether it is required depends on your research question.")),
      ),
    },
    {
      title: "3.8 PICO(S) → Eligibility Criteria: Outcomes",
      estimated_minutes: 6,
      summary:
        "\"Improvement in health\" is too vague. Define what, how measured, and when: or you won't be able to tell whether a study measured your outcome.",
      body: doc(
        p(b("O: Outcomes")),
        p("This is where many beginners make mistakes. Do not write:"),
        p(i("Improvement in health.")),
        p("That is too vague. Define:"),
        bullets([
          "What?: Depression severity",
          "How measured?: Beck Depression Inventory-II",
          "When?: At 8 weeks",
        ]),
        p(b("Key principle: "), t("if you cannot clearly tell whether a study measured your outcome, your outcome criterion may be too vague.")),
      ),
    },
    {
      title: "3.9 PICO(S) → Eligibility Criteria: Study Design",
      estimated_minutes: 6,
      summary: "RCTs for effectiveness questions; observational designs for prevalence, prognosis, or aetiology: the design depends on the question.",
      body: doc(
        p(b("S: Study Design")),
        p(b("What types of studies will we allow?")),
        p("Examples include:"),
        bullets(["randomised controlled trials", "quasi-randomised trials", "cohort studies", "case-control studies", "cross-sectional studies", "qualitative studies"]),
        p(
          "The appropriate design depends on the review question. For intervention effectiveness questions, RCTs may be appropriate. For prevalence, prognosis or aetiology questions, observational designs may be necessary.",
        ),
        p(b("The appropriate study design depends on the question.")),
      ),
    },
    {
      title: "3.10 Beyond PICO(S)",
      estimated_minutes: 6,
      summary: "PICO(S), SPIDER, PEO, SPICE, PCC, PICOT, ECLIPSE: which framework fits which question type.",
      body: doc(
        p("PICO(S) does not cover every systematic review."),
        bullets(["PICO/PICOS", "SPIDER", "PEO", "SPICE", "PCC", "PICOT", "ECLIPSE"]),
        bullets([
          "Quantitative intervention question → PICOS",
          "Observational/exposure question → PEO",
          "Qualitative question → SPIDER",
          "Scoping review → PCC",
        ]),
      ),
    },
    {
      title: "3.11 Other Eligibility Decisions",
      estimated_minutes: 10,
      summary:
        "Beyond PICOS: language, publication date (and why), publication status, setting, and publication type all need explicit decisions.",
      body: doc(
        p("Once PICO(S) is defined, there are additional decisions."),
        h(2, "Language"),
        p("Will you include English only? Or all languages?"),
        h(2, "Publication date"),
        p('Will you include studies from 2010 onward? If yes, why 2010? Possible justification:'),
        bullets(["diagnostic criteria changed", "treatment practice changed", "technology changed", "measurement instruments changed"]),
        h(2, "Publication status"),
        p("Will you include:"),
        bullets(["published journal articles?", "conference abstracts?", "dissertations?", "reports?", "preprints?"]),
        h(2, "Setting"),
        p("For example: hospitals only versus hospitals, primary care and community settings."),
        h(2, "Publication type"),
        p("You may need to specify whether you will include:"),
        bullets(["original research", "reviews", "case reports", "editorials", "commentaries", "conference abstracts"]),
      ),
    },
    {
      title: "3.12 The Big Balancing Act: Sensitivity vs Specificity",
      estimated_minutes: 10,
      summary:
        "High sensitivity catches more relevant studies but more noise; high specificity cuts noise but risks missing relevant studies. Aim for an appropriate balance, not a maximum.",
      body: doc(
        p(b("This is critical.")),
        h(2, "Sensitivity"),
        p(b("How well can your criteria capture relevant studies?")),
        p("High sensitivity: you are less likely to miss relevant evidence. But you may retrieve many irrelevant studies."),
        h(2, "Specificity"),
        p(b("How well can your criteria exclude irrelevant studies?")),
        p("High specificity: fewer irrelevant studies enter screening. But you may accidentally exclude relevant studies."),
        bullets([
          "Very sensitive → lots of studies → more irrelevant studies → more screening workload",
          "Very specific → fewer studies → less screening workload → greater risk of missing relevant evidence",
        ]),
        h(2, "SRN principle"),
        p(b("The goal is not maximum sensitivity or maximum specificity. The goal is an appropriate balance for your question.")),
      ),
    },
    {
      title: "3.13 Write Criteria Before You Screen",
      estimated_minutes: 6,
      summary:
        "Eligibility criteria are set before study selection and documented in the protocol: otherwise an interesting study can quietly change your criteria.",
      body: doc(
        p(
          "Eligibility criteria should be established before the study-selection process and documented in the protocol. A systematic review protocol will be introduced to you later in this course.",
        ),
        p("Why? Because otherwise you may see an interesting study and unconsciously change your criteria to include it."),
        bullets([
          "Bad process: find study → like study → change criteria → include study.",
          "Correct process: define criteria → search → screen → apply criteria consistently.",
        ]),
      ),
    },
    {
      title: "3.14 From Eligibility Criteria to Screening Questions",
      estimated_minutes: 8,
      summary: "Every inclusion criterion becomes a screening question: the bridge into the module on screening and selecting studies.",
      body: doc(
        p("This is the bridge into the module on screening and selecting studies."),
        p(b("Suppose your inclusion criterion says: "), t("adults aged ≥18 years with type 2 diabetes.")),
        p(b("Your screening question becomes: "), t("does this study include adults with type 2 diabetes?")),
        p(b("Suppose: "), t("randomized controlled trials only.")),
        p(b("Screening question: "), t("is this an RCT?")),
        p("This gives us the chain:"),
        numbered(["Research question", "Eligibility criteria", "Screening questions", "Study selection"]),
      ),
    },
    {
      title: "3.15 Title/Abstract vs Full-Text Eligibility",
      estimated_minutes: 8,
      summary:
        "Eligibility is applied in stages: obvious exclusions at title/abstract, the complete criteria at full text. When unsure, retrieve the full text rather than exclude.",
      body: doc(
        p("Eligibility is applied in stages."),
        h(2, "Stage 1: Title/abstract"),
        p("You are looking for obvious reasons to exclude. Example: wrong population? Wrong intervention? Wrong study type?"),
        p("If clearly irrelevant: exclude. If uncertain: retrieve full text."),
        h(2, "Stage 2: Full text"),
        p("Now apply the complete eligibility criteria."),
        h(2, "Golden screening rule"),
        p(b("If you are unsure at title/abstract stage, do not exclude simply because the abstract does not provide enough information.")),
      ),
    },
    {
      title: "3.16 Full-Text Exclusion Reasons",
      estimated_minutes: 6,
      summary: "At full text, every exclusion needs a documented reason, not just \"excluded.\"",
      body: doc(
        p('At full-text stage, don\'t simply write "Excluded." You need to know why. For example:'),
        bullets([
          "Wrong population",
          "Wrong intervention",
          "Wrong comparator",
          "Wrong outcome",
          "Wrong study design",
          "Wrong setting",
          "Wrong publication type",
          "Outside date range",
          "Duplicate publication",
        ]),
      ),
    },
    {
      title: "3.17 Worked Example",
      estimated_minutes: 10,
      summary:
        "A full PICOS breakdown and inclusion/exclusion criteria for a real review question, start to finish.",
      body: doc(
        p(b("Review question: "), t("among adults with depression, does yoga compared with usual care reduce depression severity?")),
        h(2, "PICO(S)"),
        tableItem("PICOS breakdown", [
          ["Population", "Adults ≥18 years diagnosed with depression"],
          ["Intervention", "Yoga"],
          ["Comparator", "Usual care, wait-list or eligible active comparator"],
          ["Outcome", "Depression severity measured using a validated instrument"],
          ["Study design", "RCTs"],
        ]),
        h(2, "Inclusion criteria"),
        bullets([
          "Adults aged ≥18 years.",
          "Participants diagnosed with depression using an accepted diagnostic criterion.",
          "Yoga is the intervention of interest.",
          "Eligible comparator is present.",
          "Depression severity is reported using a validated measure.",
          "Randomised controlled trials.",
          "Full-text primary research studies.",
        ]),
        h(2, "Exclusion criteria"),
        bullets([
          "Participants younger than 18 years.",
          "Participants without depression.",
          "Yoga not used as an intervention.",
          "Studies without a relevant depression outcome.",
          "Non-randomised designs.",
          "Reviews, editorials and commentaries.",
        ]),
      ),
    },
    {
      title: "3.18 Your Eligibility Criteria Table",
      estimated_minutes: 6,
      summary:
        "The domains your own eligibility table should cover: population, intervention, comparator, outcomes, study design, setting, date, language, publication status/type.",
      body: doc(
        p("Your eligibility criteria table should give inclusion criteria, exclusion criteria, and a rationale for each of these domains:"),
        bullets([
          "Population",
          "Intervention/Exposure",
          "Comparator",
          "Outcomes",
          "Study design",
          "Setting",
          "Publication date",
          "Language",
          "Publication status/type",
        ]),
        p("Not every review will need every row."),
        h(2, "Check Your Understanding"),
        ...selfCheck(
          "True or false: eligibility criteria should be changed during screening whenever the reviewer finds an interesting study.",
          "False.",
        ),
        ...selfCheck(
          "What is the main danger of criteria that are too specific?",
          "They may exclude relevant studies and reduce sensitivity.",
        ),
        ...selfCheck(
          "Scenario: your review includes only RCTs. You find a cohort study with an extremely relevant population and excellent results. What should you do?",
          "Exclude it, if the predefined study-design criterion excludes cohort studies. The fact that the result is interesting does not override the eligibility criteria.",
        ),
      ),
    },
  ],
  quiz: {
    title: "Module 3 Knowledge Check",
    pass_mark: 60,
    max_attempts: null,
    questions: [
      {
        prompt: "What is the primary purpose of eligibility criteria?",
        explanation:
          "Eligibility criteria identify which studies meet the review's predefined requirements, not to maximise study count.",
        options: [
          { label: "To make the review contain as many studies as possible" },
          { label: "To identify which studies meet the predefined requirements of the review", correct: true },
          { label: "To determine the statistical method" },
          { label: "To write the discussion" },
        ],
      },
      {
        prompt: "Which is an inclusion criterion?",
        explanation:
          "\"Adults aged ≥18 years with type 2 diabetes\" describes a characteristic a study must have: a positive requirement, not a disqualifier.",
        options: [
          { label: "Studies involving children" },
          { label: "Studies published before 2000" },
          { label: "Adults aged ≥18 years with type 2 diabetes", correct: true },
          { label: "Editorials" },
        ],
      },
      {
        prompt:
          "A review asks about CBT for insomnia in older adults. Which population criterion is more precise?",
        explanation:
          "A precise population criterion states the exact age threshold and diagnostic basis, so two reviewers reach the same decision.",
        options: [
          { label: "People with insomnia" },
          { label: "Adults" },
          { label: "Older adults" },
          {
            label: "Adults aged ≥60 years diagnosed with insomnia using predefined diagnostic criteria",
            correct: true,
          },
        ],
      },
      {
        prompt:
          "A study's abstract does not provide enough information to determine whether it meets the eligibility criteria. What should the reviewer generally do?",
        explanation:
          "The golden screening rule: don't exclude for lack of information at title/abstract stage. Retrieve the full text instead.",
        options: [
          { label: "Exclude it" },
          { label: "Include it automatically" },
          { label: "Retrieve the full text", correct: true },
          { label: "Change the eligibility criteria" },
        ],
      },
    ],
  },
  assignment: {
    title: "Your Systematic Review Eligibility Criteria",
    pass_mark: 60,
    max_attempts: null,
    submission_type: "text",
    instructions: doc(
      p(
        "Using the research question you developed in Module 2, work through the following steps and submit your complete eligibility criteria.",
      ),
      numbered([
        "Identify your framework: PICO / PICOS / PEO / SPIDER / PCC / other.",
        "Define your core eligibility: population, intervention/exposure, comparator, outcomes, and study design.",
        "Define additional eligibility: setting, date, language, publication status, and publication type.",
        "Write your inclusion criteria.",
        "Write your exclusion criteria.",
        "Give a brief rationale for each major criterion.",
      ]),
      h(2, "What your submission should cover"),
      p("At the end of this module, you should have produced your systematic review eligibility criteria, including:"),
      numbered([
        "Research question",
        "Framework",
        "Population criteria",
        "Intervention/exposure criteria",
        "Comparator criteria",
        "Outcome criteria",
        "Study-design criteria",
        "Setting",
        "Date restrictions",
        "Language restrictions",
        "Publication-status/type restrictions",
        "Inclusion criteria",
        "Exclusion criteria",
        "Rationale for important restrictions",
        "Initial screening questions",
      ]),
    ),
  },
};

export const MODULE_4 = {
  title: "4. Conducting the Systematic Literature Search",
  summary:
    "A systematic search asks how to systematically identify the relevant evidence, not what you can find: planned, transparent, comprehensive, and reproducible.",
  release_rule: "after_previous",
  contributors: [
    "Prof Ejaz Khan",
    "Dr Alison Kinengyere",
    "Dr Rehema Chande",
    "William Mviombo",
    "Adrine Nyemwiza",
  ],
  lessons: [
    {
      title: '4.1 What Makes a Search "Systematic"?',
      estimated_minutes: 10,
      summary:
        "A systematic search asks how to systematically identify the relevant evidence, using a funnel: cast wide, let screening decide what's actually eligible.",
      body: doc(
        h(2, "Searching Is Not Googling"),
        p(
          "You already know how to search the internet. You type a few words into Google, scan the results and click the pages that look useful. A systematic literature search is different.",
        ),
        p(
          "You are not simply trying to find some papers about your topic. You are trying to identify as much of the relevant evidence as reasonably possible, using a planned, transparent and reproducible method.",
        ),
        p("The search therefore needs to be:"),
        bullets(["systematic", "comprehensive", "transparent", "reproducible", "appropriate to the research question"]),
        p(b("Key distinction: "), t('a normal literature search asks "What can I find?" A systematic search asks "How can I systematically identify the relevant evidence?"')),
        h(2, "The Search Is a Funnel"),
        p(
          "At the beginning, your search may retrieve thousands of records. That is normal. You are deliberately casting a reasonably wide net. The search should not try to identify only the papers you already know about. Later, screening will determine which records actually meet your eligibility criteria.",
        ),
        p(
          b("SRN principle: "),
          t("the search finds potentially relevant evidence. Screening determines what is actually eligible. That distinction is extremely important."),
        ),
      ),
    },
    {
      title: "4.2 Start With the Question, Not the Database",
      estimated_minutes: 8,
      summary:
        "Break your question into concepts first. Don't automatically turn every PICO element into a search block: search strategies usually focus on population/condition and intervention.",
      body: doc(
        h(2, "Break the Question Into Concepts"),
        p("Use the research question from Module 2. For example:"),
        p(b("Among adults with hypertension, does regular physical activity compared with no exercise reduce blood pressure?")),
        p("We can identify:"),
        bullets([
          "Concept 1, population/condition: hypertension",
          "Concept 2, intervention: physical activity",
          "Concept 3, outcome: blood pressure",
        ]),
        h(2, "Do Not Automatically Search Every PICO Element"),
        p(b("A beginner might think: P + I + C + O = four search boxes. That is not always correct.")),
        p(
          "For example, the outcome may not appear in the title or abstract even though the study measures it. Current guidance notes that it is often unnecessary, and sometimes undesirable, to search every aspect of the question. Search strategies commonly focus on the main population/condition and intervention concepts, with study-design terms where appropriate.",
        ),
        p(b("Use PICO to understand your question. Do not automatically turn every PICO element into a search block.")),
      ),
    },
    {
      title: "4.3 Build Your Search Vocabulary",
      estimated_minutes: 12,
      summary:
        "One concept can have many names. Draw search terms from your question, eligibility criteria, seed studies, subject headings, and existing reviews.",
      body: doc(
        h(2, "One Concept Can Have Many Names"),
        p(b("Suppose your concept is: "), t("adolescent.")),
        p("A paper might use:"),
        bullets(["adolescent", "adolescents", "teenager", "teenagers", "youth", "youths", "young people", "young adults"]),
        p("If you search only adolescent, you may miss relevant records."),
        h(2, "Where Do Search Terms Come From?"),
        p("Don't simply sit down and invent synonyms. Use several sources:"),
        numbered([
          "Your research question: extract the obvious concepts.",
          "Eligibility criteria: look for terminology used to describe the population, intervention and condition.",
          "Seed studies: these are known relevant studies.",
          "Subject headings: look at controlled vocabulary.",
          "Existing systematic reviews: their search strategies can help you discover terminology. Important: you are using them to discover terms and sources, not simply copying their search.",
          "Database indexing: explore how the database labels the concept.",
        ]),
        h(2, "The Search Term Harvesting Table"),
        tableItem("Hypertension", [
          ["Keywords", "hypertension"],
          ["Synonyms", "high blood pressure"],
          ["Acronyms", "HTN"],
          ["Subject heading", "Hypertension"],
        ]),
        tableItem("Exercise", [
          ["Keywords", "exercise"],
          ["Synonyms", "physical activity; aerobic training"],
          ["Acronyms", "PA"],
          ["Subject heading", "Exercise"],
        ]),
        tableItem("Adolescents", [
          ["Keywords", "adolescent"],
          ["Synonyms", "teenager; youth; young people"],
          ["Subject heading", "Adolescent"],
        ]),
        p(b("Activity: "), t("build one of these tables for your own review.")),
      ),
    },
    {
      title: "4.4 Boolean Operators: The Language of Searching",
      estimated_minutes: 10,
      summary:
        "OR joins synonyms and broadens the search; AND joins concepts and narrows it; NOT is dangerous; parentheses make the logic explicit.",
      body: doc(
        h(2, "OR: Make a Concept Bigger"),
        p(
          b("OR "),
          t('connects synonyms or related terms. It means: give me records containing any of these terms. Example: adolescent OR teenager OR youth. This makes the search broader.'),
        ),
        h(2, "AND: Connect Different Concepts"),
        p(
          b("AND "),
          t("connects different concepts. For example: hypertension AND exercise. The results must contain both concepts. This makes the search narrower."),
        ),
        p(b("The golden rule: "), t("OR joins synonyms. AND joins concepts. This should be memorised.")),
        h(2, "NOT: Use With Caution"),
        p("Example: cancer NOT breast. This removes records containing breast."),
        p(
          "But NOT can be dangerous. A relevant paper might mention breast cancer somewhere in the record even though it contains useful evidence for your review.",
        ),
        p(b("Do not use NOT simply because it reduces the number of results.")),
        h(2, "Parentheses Matter"),
        p(
          "Consider: adolescent OR teenager AND exercise. This can be interpreted differently depending on database syntax and operator precedence.",
        ),
        p("Instead write: (adolescent OR teenager) AND exercise. Now the logic is explicit."),
      ),
    },
    {
      title: "4.5 Search Techniques That Make Your Search Stronger",
      estimated_minutes: 12,
      summary:
        "Phrase searching, truncation, wildcards, and field searching: each database-specific, none universal.",
      body: doc(
        h(2, "Phrase Searching"),
        p(
          'Without quotation marks (maternal mortality), the database may search the individual words. With quotation marks ("maternal mortality"), you ask for the phrase.',
        ),
        p(b('Activity: '), t('which should you use: physical activity or "physical activity"? The answer depends on the database and search purpose.')),
        h(2, "Truncation"),
        p("A truncation symbol allows multiple word endings to be searched. For example:"),
        bullets([
          "pregnan* can retrieve: pregnant, pregnancy, pregnancies",
          "adolescen* may retrieve: adolescent, adolescents, adolescence",
        ]),
        p(b("But: truncation is database-specific. ") , t("The symbol and rules are not universal.")),
        h(2, "Wildcards"),
        p("Wildcards can help account for spelling variations. For example:"),
        bullets(["colo*r for: color, colour", "organi#e for: organize, organise"]),
        p(b("Important: "), t("the wildcard symbol is not universal. Always check the database's search rules.")),
        h(2, "Field Searching"),
        p("Instead of searching everywhere, you can specify where a term should appear. Examples: title, abstract, author, subject heading, DOI."),
        p(b("Example: "), t("hypertension[tiab] means the term is searched in the title/abstract fields in PubMed.")),
      ),
    },
    {
      title: "4.6 Keywords + Controlled Vocabulary",
      estimated_minutes: 15,
      summary:
        "Keywords alone miss synonymous terms and unindexed new papers: use both controlled vocabulary (MeSH) and free text, and understand Explode and Major Topic before relying on them.",
      body: doc(
        h(2, "What Are Subject Headings?"),
        p(
          "Some databases do more than store the words authors use. They assign controlled vocabulary to articles. In PubMed/MEDLINE, this is MeSH: Medical Subject Headings.",
        ),
        h(2, "Why Keywords Alone Are Not Enough"),
        p(
          'Suppose one article says "heart attack." Another says "myocardial infarction." Another says "acute myocardial infarction." Another uses an abbreviation. A keyword search may miss some records.',
        ),
        p("A controlled vocabulary system helps bring records together under an indexed concept."),
        p(b("But there is a second problem: "), t("new articles may not yet have been indexed.")),
        p(b("Use both controlled vocabulary and free-text keywords.")),
        h(2, "The Two-Layer Search"),
        bullets([
          "Controlled vocabulary: MeSH",
          "Free text: keywords, synonyms, spelling variants, acronyms, truncations",
          "Together → more comprehensive retrieval",
        ]),
        h(2, "How PubMed Interprets a Basic Search"),
        p(
          "When you type a term or phrase into the basic PubMed search box, PubMed does not necessarily treat it as a simple literal text search. PubMed uses Automatic Term Mapping (ATM) to help interpret search terms. It may map terms to MeSH and search across relevant fields.",
        ),
        p(
          'For example, when you enter a concept such as "malaria prevention", PubMed may automatically interpret and expand the search rather than simply looking for those exact words.',
        ),
        p(
          "This is useful for ordinary searching, but for a systematic review you need to understand exactly how your search is being constructed.",
        ),
        p(b("SRN principle: "), t("automatic searching is useful. Explicit, deliberate searching is essential for a systematic review.")),
        h(2, "MeSH in PubMed"),
        p("PubMed → Explore → MeSH Database → Search concept → Inspect MeSH record → Look at: definition, entry terms, hierarchy, subheadings, narrower terms."),
        h(2, "How to Read a MeSH Record"),
        p("Finding a MeSH term is only the beginning. You should inspect the MeSH record before deciding how to use it. A MeSH record provides:"),
        bullets([
          [b("Definition: "), t("does this MeSH term actually represent the concept you are interested in?")],
          [b("Entry terms: "), t("alternative terms and synonyms associated with the MeSH concept.")],
          [b("Tree structure: "), t("where the concept sits within the MeSH hierarchy and whether narrower concepts exist beneath it.")],
          [b("Subheadings: "), t("these allow particular aspects of a concept to be specified.")],
          [b("Major Topic information: "), t("indicates whether the concept is treated as a major focus of an article.")],
        ]),
        p(b("Do not simply copy the first MeSH term you find. Inspect the record and understand what it covers.")),
        h(2, "Explode and Major Topic"),
        p(b("Explode: "), t("searches the broader heading and narrower terms beneath it.")),
        p(b("Major Topic: "), t("restricts retrieval to records where the concept is a major focus.")),
        p(b("Beginner warning: "), t("do not use Major Topic simply because it gives fewer results. Fewer results does not automatically mean a better systematic search.")),
        h(2, 'Why "Explode" Matters'),
        p(
          "Controlled vocabularies are often hierarchical: a broad concept has narrower concepts, and more specific concepts, beneath it. When a controlled-vocabulary term is exploded, the search can include narrower terms beneath that heading, which can help retrieve records indexed under more specific concepts.",
        ),
        p(
          "However, whether and how explosion works depends on the database and its controlled vocabulary. The searcher should understand the database's rules rather than assuming that every database handles subject headings in exactly the same way.",
        ),
      ),
    },
    {
      title: "4.7 Build a Search Strategy From Scratch",
      estimated_minutes: 15,
      summary:
        "A worked example: identify concepts, build each search block with OR, combine blocks with AND, and structure the strategy as separate, inspectable search lines.",
      body: doc(
        h(2, "Our Example Question"),
        p(b("What is the effectiveness of physical activity interventions in reducing blood pressure among adults with hypertension?")),
        h(2, "Step 1: Identify Concepts"),
        p("We will use Concept 1: Hypertension, Concept 2: Physical activity, Concept 3: Blood pressure."),
        p(
          "For this particular search, we may decide not to make adults and blood pressure separate mandatory search blocks, depending on the question and expected indexing/text visibility.",
        ),
        h(2, "Step 2: Build Each Search Block"),
        p(b("Hypertension: "), t('"Hypertension"[MeSH] OR hypertension[tiab] OR "high blood pressure"[tiab]')),
        p(
          b("Exercise: "),
          t('"Exercise"[MeSH] OR "Exercise Therapy"[MeSH] OR "physical activity"[tiab] OR "exercise intervention*"[tiab] OR "aerobic training"[tiab]'),
        ),
        h(2, "Step 3: Combine the Blocks"),
        p(
          i(
            '("Hypertension"[MeSH] OR hypertension[tiab] OR "high blood pressure"[tiab]) AND ("Exercise"[MeSH] OR "Exercise Therapy"[MeSH] OR "physical activity"[tiab] OR "exercise intervention*"[tiab] OR "aerobic training"[tiab])',
          ),
        ),
        p(b("Within a block: "), t("OR = any of these terms. Between blocks: AND = both concepts must be represented.")),
        h(2, "A Second Worked Example: Search Lines"),
        p(
          "Instead of immediately writing one long search string, you can build the strategy as separate search lines. For example:",
        ),
        p(i("#1 Hypertension\n#2 Exercise\n#3 #1 AND #2")),
        p(
          "This approach makes the search easier to inspect, modify and troubleshoot. You can add further lines as your strategy becomes more complex. The same approach will be particularly useful when working in platforms such as Cochrane's Search Manager.",
        ),
        h(2, "Search Strategy Anatomy"),
        p("(Search Block 1) AND (Search Block 2) AND (Search Block 3)"),
      ),
    },
    {
      title: "4.8 Choosing Where to Search",
      estimated_minutes: 10,
      summary:
        "A minimum of three databases is recommended, chosen because they suit the question, not because everyone else uses them. Know the difference between a database and a platform.",
      body: doc(
        h(2, "One Database Is Usually Not Enough"),
        p(
          "A systematic search normally involves multiple information sources. A minimum of three databases is recommended. Why? Because databases overlap, but they are not identical: one database may contain records another does not.",
        ),
        p(b("Do not choose databases because everyone else uses them. Choose them because they are appropriate for your question.")),
        h(2, "Common Databases"),
        bullets([
          "Biomedical/health: MEDLINE/PubMed, Embase, Cochrane CENTRAL",
          "Nursing: CINAHL",
          "Psychology: PsycINFO",
          "Education: ERIC",
          "Multidisciplinary: Scopus, Web of Science",
          "Other specialised databases: depends on the topic",
        ]),
        h(2, "Database vs Platform"),
        p("This is an important beginner confusion."),
        p(b("A database is the collection of records. Example: MEDLINE.")),
        p(b("A platform is the interface through which you search it. Example: EBSCO.")),
        p(
          "For example, MEDLINE may be searched through different platforms, and EBSCO may provide access to multiple databases. The learner therefore needs to record both database and platform where relevant. PRISMA-S explicitly recommends reporting each database and the platform used.",
        ),
      ),
    },
    {
      title: "4.9 PubMed: Your First Real Systematic Search",
      estimated_minutes: 15,
      summary:
        "Combining keyword and MeSH searching in PubMed, using search history, the Advanced Search Builder, filters, and saved searches.",
      body: doc(
        h(2, "PubMed Search Structure"),
        p("PubMed supports two major approaches to searching: keyword/free-text searching, and controlled-vocabulary searching using MeSH."),
        p(
          "In practice, an effective systematic search will often combine both. The goal is not simply to choose between keywords and MeSH: it is to understand what each contributes and combine them deliberately.",
        ),
        h(2, "Build the Search"),
        numbered([
          "Identify MeSH terms.",
          "Add free-text synonyms.",
          "Combine synonyms with OR.",
          "Combine concepts with AND.",
          "Run the search.",
          "Inspect the results.",
        ]),
        h(2, "Use Search History"),
        p("You do not need to repeatedly overwrite the search box. Instead:"),
        p(i("#1 Hypertension\n#2 Exercise\n#3 #1 AND #2")),
        p("Why this matters: easy to inspect, easy to modify, easier to document, easier to troubleshoot."),
        h(2, "PubMed Advanced Search Builder"),
        p("PubMed's Advanced Search Builder allows you to construct more structured searches. It can be used to:"),
        bullets([
          "combine multiple search statements",
          "build structured queries",
          "specify search fields",
          "work with field tags such as [tiab], [mesh], [au] and [dp]",
        ]),
        p(b("For example: "), t('("hypertension"[MeSH Terms]) AND ("guideline"[Publication Type])')),
        p("You do not need to memorise every field tag. What matters is understanding that field searching allows you to control where PubMed searches for a term."),
        h(2, "Do Not Filter Too Early"),
        p(b("Search first. Inspect. Then consider justified limits.")),
        p("A filter can exclude relevant evidence."),
        h(2, "PubMed Filters and Limits"),
        p("After running a search, PubMed allows you to apply filters such as:"),
        bullets(["article type", "text availability", "publication date", "species", "sex", "age group", "language"]),
        p(
          "These can be useful when they are justified by your eligibility criteria. However, applying filters simply to reduce the number of results can cause relevant evidence to be missed.",
        ),
        p(b("SRN principle: "), t("a filter should have a methodological reason, not merely a convenience reason.")),
        h(2, "Save Your Search"),
        p(
          "If your review is ongoing, you can save your PubMed search strategy using an NCBI account. Saved searches can allow you to return to the strategy later and set up email alerts for newly published records. This can be useful for ongoing systematic reviews, search updates, evidence surveillance, and long-term research projects.",
        ),
        p("However, an automated alert is not a substitute for a documented systematic-review search update."),
      ),
    },
    {
      title: "4.10 Cochrane Library and CENTRAL",
      estimated_minutes: 15,
      summary:
        "The Cochrane Library holds several distinct resources (Reviews, CENTRAL, Clinical Answers, Protocols), searched through basic or advanced search, including the Search Manager.",
      body: doc(
        h(2, "Why Search Cochrane?"),
        p("Cochrane Library contains several resources, including Cochrane Reviews, protocols, CENTRAL, and Clinical Answers."),
        h(2, "What's Inside the Cochrane Library?"),
        p("The Cochrane Library is not a single database. It contains several resources serving different purposes."),
        bullets([
          [b("Cochrane Database of Systematic Reviews: "), t("contains Cochrane systematic reviews.")],
          [
            b("CENTRAL: "),
            t("the Cochrane Central Register of Controlled Trials contains reports of randomised and quasi-randomised controlled trials."),
          ],
          [b("Cochrane Clinical Answers: "), t("provide concise, clinically focused summaries based on Cochrane evidence.")],
          [b("Cochrane Protocols: "), t("show planned or ongoing systematic reviews.")],
        ]),
        p("For your own systematic review, it is important to understand which Cochrane resource you are using and what question it can help you answer."),
        h(2, "Basic vs Advanced Search"),
        p(b("Basic search: "), t("useful for quick exploratory searching.")),
        p(b("Advanced Search: "), t("provides Boolean operators, field searching, Search Manager, search history, controlled vocabulary.")),
        h(2, "When Should You Use Basic Search?"),
        p(
          "Basic search is useful when you want to quickly explore a topic or check whether relevant Cochrane reviews already exist. For example, you might initially search: zinc acute diarrhea children. This can quickly reveal Cochrane Reviews, protocols, Clinical Answers and trial-related records.",
        ),
        p("However, a simple keyword search should not be confused with the final systematic search strategy."),
        h(2, "Build a Cochrane Search"),
        p("Search line 1: Zinc. Search line 2: Acute diarrhoea. Search line 3: Children. Then: #1 AND #2 AND #3."),
        h(2, "Cochrane Search Manager: A Worked Example"),
        p("The Cochrane Search Manager allows you to construct a search as separate search lines. For example, for zinc supplementation in acute diarrhoea among children:"),
        bullets([
          '(zinc) OR "zinc supplementation" OR "zinc oxide": or use the appropriate MeSH descriptor.',
          '(diarrhea OR diarrhoea) AND (acute OR "acute gastroenteritis")',
          "(child OR children OR pediatric OR paediatric OR infant*)",
        ]),
        p(b("Final combination: "), t("#1 AND #2 AND #3.")),
        p(
          "This demonstrates the same basic logic used throughout systematic searching: synonyms are grouped within concepts, and concepts are then combined using AND.",
        ),
      ),
    },
    {
      title: "4.11 Translating the Search Across Databases",
      estimated_minutes: 8,
      summary:
        "The concepts stay the same across databases; the search syntax changes: MeSH becomes Emtree in Embase, and each database has its own field syntax.",
      body: doc(
        h(2, "You Cannot Simply Copy-Paste"),
        p("A PubMed search may contain [MeSH], [tiab], *. Another database may use different syntax."),
        p("Search strategies need to be customised for each database, because controlled vocabularies and search syntax differ."),
        p(b("The concepts stay the same. The search syntax changes.")),
        h(2, "Translation Example"),
        p(b("Concept: "), t("hypertension.")),
        p(b("PubMed: "), t('"Hypertension"[MeSH] OR hypertension[tiab]')),
        p(b("Embase: "), t("would use Emtree rather than MeSH.")),
        p(b("Scopus/Web of Science: "), t("would use their own field syntax and search structure.")),
        p("The learner does not need to memorise every syntax in this module. They need to understand the principle:"),
        p(b("Build once conceptually; translate carefully technically.")),
      ),
    },
    {
      title: "4.12 Is Your Search Good Enough?",
      estimated_minutes: 10,
      summary:
        "Test your search against seed studies. For systematic reviews, high sensitivity is usually prioritised over precision: a tiny result set is a warning sign, not a success.",
      body: doc(
        h(2, "Test Your Search With Seed Studies"),
        p(b("Remember your seed studies? Now use them as a test. Ask: does my search retrieve my known relevant papers?")),
        p('If it doesn\'t, don\'t immediately say "the paper must not be relevant." Instead investigate:'),
        bullets([
          "Is my terminology incomplete?",
          "Did I miss a synonym?",
          "Is there another spelling?",
          "Is the paper indexed differently?",
          "Did I make a Boolean error?",
          "Did I apply a restrictive filter?",
        ]),
        h(2, "Precision vs Sensitivity"),
        p(b("Sensitivity: "), t("how much relevant evidence are we finding?")),
        p(b("Precision: "), t("how much of what we retrieve is relevant?")),
        p("For systematic reviews, high sensitivity is usually prioritised, even if that means retrieving many irrelevant records."),
        p("High sensitivity → more potentially relevant studies → more screening."),
        p(b("SRN message: "), t("do not celebrate a tiny number of search results. A tiny result set may mean you have built an overly restrictive search.")),
      ),
    },
    {
      title: "4.13 Searching Beyond Bibliographic Databases",
      estimated_minutes: 10,
      summary:
        "Trial registries, grey literature, and websites can hold evidence bibliographic databases miss. Backward and forward citation searching find studies your search didn't.",
      body: doc(
        h(2, "Your Database Search Is Not Necessarily the End"),
        p("Depending on your review question, you may also need to search:"),
        bullets([
          [b("Trial registries: "), t("for example, ClinicalTrials.gov, WHO ICTRP.")],
          [b("Grey literature: "), t("dissertations/theses, conference proceedings, government reports, organisational reports, technical reports.")],
          [b("Websites: "), t("relevant professional bodies, government agencies or organisations may contain evidence not indexed in standard bibliographic databases.")],
        ]),
        h(2, "Citation Searching"),
        p("There are two useful directions."),
        p(b("Backward citation searching: "), t("look at the references of a relevant paper. What studies did this paper cite?")),
        p(b("Forward citation searching: "), t("find papers that cite the relevant paper. Who cited this paper later?")),
        p("Why? A relevant study can lead you to additional relevant studies that your database search did not retrieve."),
      ),
    },
    {
      title: "4.14 Search Documentation: If You Didn't Record It, You Can't Reproduce It",
      estimated_minutes: 8,
      summary:
        "Record the database, platform, date searched, full search strategy, filters, and number retrieved: for every database.",
      body: doc(
        h(2, "Record Every Search"),
        p("For every database, record:"),
        tableItem("Search record example", [
          ["Database", "PubMed"],
          ["Platform", "PubMed"],
          ["Date searched", "26 August 2026"],
          ["Search strategy", "Full search string"],
          ["Filters/limits", "None"],
          ["Number retrieved", "1,284"],
        ]),
        h(2, "The Search Log"),
        p("Use a template covering, for each database (PubMed/PubMed, Embase/Elsevier, Scopus/Elsevier, Web of Science/Clarivate, CINAHL/EBSCO, and any others you search):"),
        bullets(["Database", "Platform", "Date", "Search strategy", "Results", "Exported?"]),
      ),
    },
    {
      title: "4.15 Search Updates and Closing the Search",
      estimated_minutes: 6,
      summary:
        "A search is conducted at a point in time, but new studies keep appearing: record whether and how the search was updated before the review is published.",
      body: doc(
        p(
          "A search is conducted at a particular point in time. But new studies may appear while you are working. Therefore the search may need to be updated before the review is completed or published.",
        ),
        p(b("Initial search ≠ forever current search.")),
        p("Record:"),
        bullets(["original search date", "update date", "whether the same strategy was rerun", "any changes made", "additional records retrieved"]),
      ),
    },
    {
      title: "4.16 Exporting Your Search Results",
      estimated_minutes: 8,
      summary:
        "Export records rather than copying them by hand, preserving citation information, unique identifiers, and the source database for every record.",
      body: doc(
        h(2, "Exporting Citations"),
        p(b("Do not manually copy papers one by one. Export the records.")),
        p("PubMed provides several options for exporting search results, including citation formats and formats such as CSV and PMID."),
        p("The important point is not simply to export the papers. Preserve enough information to identify and manage the records later. Where possible, preserve:"),
        bullets([
          "citation information",
          "unique identifiers such as PMID",
          "DOI where available",
          "abstract information where available",
          "the database from which the record was retrieved",
        ]),
        p(b("Important: "), t("the next module will deal with managing records, deduplication and screening in detail. So here we only teach enough exporting to get the records safely into the next stage.")),
        h(2, "Important Points to Note"),
        p(
          "Current Cochrane guidance suggests that systematic searches should generally prioritise high sensitivity, even when precision is relatively low.",
        ),
        p(b("A search that finds 20 papers is not necessarily better than one that finds 20,000. The question is whether it is capable of finding the relevant evidence.")),
        h(2, "Search Quality Control"),
        p(
          "A high-quality search should ideally be checked by another person, particularly someone experienced in information retrieval. The PRESS guideline provides a structured approach for reviewing electronic search strategies, including the translation of the question, Boolean/proximity operators, subject headings, text words, syntax and limits/filters.",
        ),
        p(b("Before you trust your search, have someone else inspect it, specifically a systematic review librarian or an experienced systematic review researcher.")),
        h(2, "Check Your Understanding"),
        ...selfCheck("Which operator is normally used to combine synonyms?", "OR."),
        ...selfCheck("Which operator normally combines different concepts?", "AND."),
        ...selfCheck(
          "What is the purpose of parentheses in a search string?",
          "To group search terms and control the logic of the search.",
        ),
        ...selfCheck(
          "Why might you use PubMed's Advanced Search Builder or Search History rather than constructing everything as one long search?",
          "To build, inspect, modify and document individual search statements and their combinations.",
        ),
      ),
    },
  ],
  quiz: {
    title: "Module 4 Quiz",
    pass_mark: 60,
    max_attempts: null,
    questions: [
      {
        prompt: "What is Automatic Term Mapping (ATM) in PubMed?",
        explanation:
          "ATM is how PubMed interprets and maps the terms you type, including to MeSH, rather than treating them as a literal text search.",
        options: [
          { label: "A method for removing duplicate records" },
          { label: "A method PubMed uses to interpret and map search terms", correct: true },
          { label: "A method for screening titles and abstracts" },
          { label: "A method for exporting citations" },
        ],
      },
      {
        prompt: "Which of the following can you find when inspecting a MeSH record?",
        explanation: "A MeSH record shows all of these: definition, entry terms, hierarchical tree structure, and subheadings.",
        options: [
          { label: "Definition" },
          { label: "Entry terms" },
          { label: "Hierarchical tree structure" },
          { label: "Subheadings" },
          { label: "All of the above", correct: true },
        ],
      },
      {
        prompt:
          "Scenario: you have a search that returns only 17 results. You know that at least five relevant studies exist but only two were retrieved. What should you do?",
        explanation:
          "A search that misses known relevant studies needs investigation and revision, not acceptance or a rush to screening.",
        options: [
          { label: "Accept the 17 results because the search is specific" },
          { label: "Start screening immediately" },
          { label: "Investigate and revise the search strategy", correct: true },
          { label: "Exclude the five known studies" },
        ],
      },
    ],
  },
  assignment: {
    title: "Build and Run Your Systematic Search",
    pass_mark: 60,
    max_attempts: null,
    submission_type: "either",
    instructions: doc(
      p("Take the review question from Modules 1–3 and build and run a real systematic search."),
      numbered([
        "Write your review question.",
        "Identify your search concepts.",
        "Create a search-term harvesting table.",
        "Identify synonyms, spelling variants, acronyms, phrases, and controlled vocabulary.",
        "Identify at least 3 seed studies.",
        "Construct your first search block.",
        "Construct all search blocks.",
        "Combine them using Boolean operators.",
        "Run the search in PubMed.",
        "Check whether your seed studies are retrieved.",
        "Refine the search if necessary.",
        "Record the final search strategy.",
        "Run/translate the search in at least one additional appropriate database.",
        "Record the database, platform, date, search string, and number retrieved.",
        "Conduct at least one supplementary search: backward citation search, forward citation search, trial registry, grey literature source, or relevant website.",
        "Export your results.",
      ]),
      h(2, "Before finalising the search, also show that you have:"),
      numbered([
        "Checked how PubMed interpreted your basic search: inspect PubMed's search details/Advanced Search tools where appropriate.",
        "Inspected at least one relevant MeSH record: record the term selected and briefly explain why it represents the concept.",
        "Built the PubMed strategy using search lines or Search History: show how individual concepts were constructed before being combined.",
        "Applied filters only where justified: if a filter was used, state why it was methodologically justified.",
        "Saved the final search strategy: preserve the exact final search string used.",
      ]),
      h(2, "Your final output should include"),
      bullets([
        "Search Concept Table",
        "Search Term Table",
        "Seed Study List",
        "PubMed Search Strategy",
        "Second Database Search Strategy",
        "Search Log",
        "Supplementary Search Log",
        "Exported Search Results",
        "MeSH Term/Subject Heading Notes",
        "Search Strategy Development History: the progression from the initial search to the refined final strategy.",
        "Search Validation Check: evidence that you tested the strategy against your known seed studies.",
      ]),
      h(2, "SRN search quality check"),
      p("Before submitting, you should be able to answer yes to all of the following:"),
      bullets([
        "Have I identified the main concepts in my research question?",
        "Have I identified synonyms and alternative terminology for each concept?",
        "Have I checked the relevant controlled vocabulary?",
        "Have I inspected at least one relevant MeSH/subject-heading record?",
        "Have I used OR to combine synonyms?",
        "Have I used AND to combine concepts?",
        "Have I used parentheses to make the logic explicit?",
        "Have I considered truncation/wildcards where appropriate?",
        "Have I used field searching appropriately?",
        "Have I tested the search against known relevant/seed studies?",
        "Have I avoided unjustified filters?",
        "Have I adapted the strategy for each database?",
        "Have I documented the exact strategy, database, platform, date and results?",
        "Have I preserved the exported results?",
        "Has someone else reviewed my search strategy?",
      ]),
    ),
  },
};

export const MODULE_5 = {
  title: "5. Screening and Selecting Studies",
  summary:
    "Screening decides which records from your search actually belong in the review: applying the same predefined eligibility rules to every record, consistently.",
  release_rule: "after_previous",
  contributors: ["Prof Ejaz Khan", "Moriam Chibuzor", "Dr Reginald Quansah"],
  lessons: [
    {
      title: "5.1 What Is Study Screening?",
      estimated_minutes: 10,
      summary:
        "Screening is a series of gates from records identified to included studies. The goal is applying the same eligibility rules to every record, not choosing the studies you like.",
      body: doc(
        h(2, "From Thousands of Records to Eligible Studies"),
        p(
          "After your systematic search, you will probably have a large collection of records. But not every record belongs in your review.",
        ),
        p(
          "Screening is the process of examining those records and deciding which ones meet your predefined eligibility criteria. Think of it as a series of gates:",
        ),
        numbered([
          "Search",
          "Records identified",
          "Title/abstract screening",
          "Full-text screening",
          "Eligible studies",
          "Included studies",
        ]),
        p(b("The goal is not to choose the studies you like. The goal is to apply the same eligibility rules to every record.")),
        h(2, "Why Screening Matters"),
        p("Screening is important because it:"),
        bullets([
          "reduces selection bias",
          "ensures that studies are selected consistently",
          "makes the review transparent and reproducible",
          "creates an audit trail of decisions",
          "prevents irrelevant studies from entering the review",
        ]),
        p(
          b("SRN principle: "),
          t("you do not decide which studies to include based on whether you like their findings. You decide based on whether they meet your eligibility criteria."),
        ),
      ),
    },
    {
      title: "5.2 The Two-Stage Screening Process",
      estimated_minutes: 10,
      summary:
        "Title/abstract screening asks 'could this be eligible?' with limited information: when in doubt, keep it. Full-text screening asks 'is this eligible?' and makes the final call.",
      body: doc(
        h(2, "Stage 1: Title and Abstract Screening"),
        p("At this stage, you usually have only limited information about each record. You examine: title, abstract, sometimes basic bibliographic information."),
        p(b("Your question is: does this record appear potentially eligible?")),
        p("You are not yet making the final eligibility decision."),
        p(b("The rule: "), t("when in doubt, keep it. If you cannot confidently exclude a record from the title and abstract, send it to full-text screening.")),
        h(2, "Stage 2: Full-Text Screening"),
        p("Now you obtain the complete article. You examine the study against all relevant eligibility criteria."),
        p(b("Your question becomes: does this study actually meet our eligibility criteria?")),
        p("At this stage, you can make a definitive inclusion or exclusion decision. If you exclude the study, you should record why."),
        h(2, "The Screening Funnel"),
        numbered([
          "Search results",
          "Title/abstract screening: exclude, or include/unclear",
          "Full-text screening: exclude, or include",
          "Included studies",
        ]),
        p(b("SRN principle: "), t("title/abstract screening asks: could this be eligible? Full-text screening asks: is this eligible?")),
      ),
    },
    {
      title: "5.3 Build Your Screening Checklist",
      estimated_minutes: 10,
      summary:
        "Don't screen from memory: a written checklist keeps criteria applied consistently across hundreds or thousands of records. Pilot it before the full screen.",
      body: doc(
        h(2, "Don't Screen From Memory"),
        p(
          "Imagine screening 1,000 studies. If you rely on memory, you may gradually change the way you apply your criteria. Instead, create a screening checklist before you begin.",
        ),
        p("Your checklist should translate your eligibility criteria into questions that can be answered consistently. For example:"),
        tableItem("Screening checklist", [
          ["Correct population?", "Yes / No / Unclear"],
          ["Correct intervention/exposure?", "Yes / No / Unclear"],
          ["Correct comparator?", "Yes / No / Unclear"],
          ["Correct study design?", "Yes / No / Unclear"],
          ["Meets setting criteria?", "Yes / No / Unclear"],
          ["Meets publication criteria?", "Yes / No / Unclear"],
        ]),
        h(2, "Pilot the Checklist"),
        p("Before screening hundreds of records: test the checklist. Take a small sample of studies that appear clearly eligible, clearly ineligible, and difficult or unclear. Then apply the checklist. Ask:"),
        bullets([
          "Are the questions understandable?",
          "Are reviewers interpreting them in the same way?",
          "Are there situations the checklist does not cover?",
          "Are new exclusion categories appearing?",
        ]),
        p("Then revise the checklist if necessary."),
        p(b("SRN principle: "), t("pilot the screening process before committing to the full screening exercise.")),
      ),
    },
    {
      title: "5.4 Making Title and Abstract Decisions",
      estimated_minutes: 8,
      summary:
        "Three decisions at title/abstract screening: include, exclude, unclear. Unclear does not mean excluded: move it forward to full text.",
      body: doc(
        h(2, "The Three Possible Decisions"),
        p("At title/abstract screening, use three decisions:"),
        bullets([
          [b("Include: "), t("the record appears potentially eligible.")],
          [b("Exclude: "), t("there is enough information to confidently determine that it does not meet your criteria.")],
          [b("Unclear: "), t("there is not enough information to make a confident decision.")],
        ]),
        p(b("The important rule: "), t("unclear does not mean excluded. If you are unsure, move it forward to full-text screening.")),
        h(2, "Common Reasons for Exclusion"),
        p("A record may be excluded because of:"),
        bullets([
          "wrong population",
          "wrong intervention/exposure",
          "wrong comparator",
          "wrong outcome",
          "wrong setting",
          "wrong study design",
          "wrong publication type",
          "clearly outside the review question",
        ]),
        p(
          b("Important: "),
          t('at title/abstract screening, do not invent reasons that the abstract does not establish. If the information is insufficient: unclear → full text.'),
        ),
      ),
    },
    {
      title: "5.5 Full-Text Screening",
      estimated_minutes: 8,
      summary:
        "Go through the eligibility checklist systematically against the full article, and record a specific reason, not \"not relevant\", for every exclusion.",
      body: doc(
        h(2, "Read Against the Criteria"),
        p('Once you have the full article, go through your eligibility checklist systematically. Do not simply read the paper and ask "Does this look relevant?"'),
        p(b("Instead ask: does this study satisfy each of our predefined criteria?")),
        p("For example:"),
        bullets([
          [b("Population: "), t("does the study include the population defined in our protocol?")],
          [b("Intervention/exposure: "), t("is it the intervention or exposure we specified?")],
          [b("Study design: "), t("does it use an eligible design?")],
          [b("Setting: "), t("does it meet our setting requirements?")],
          [b("Outcomes: "), t("does it provide the outcome information required by our eligibility criteria?")],
        ]),
        h(2, "Document the Reason for Exclusion"),
        p('At full-text screening, "not relevant" is not a sufficiently useful reason. Instead record a specific reason:'),
        bullets(["Wrong population", "Wrong study design", "Wrong intervention", "Wrong setting", "Wrong publication type", "No eligible outcome"]),
        p("This creates an audit trail and later helps you report the selection process."),
      ),
    },
    {
      title: "5.6 Who Should Screen?",
      estimated_minutes: 10,
      summary:
        "Ideally two reviewers screen independently, without following each other. When they disagree, discuss the criteria, escalate to a third reviewer if needed, and document the resolution.",
      body: doc(
        h(2, "Independent Duplicate Screening"),
        p(
          "Ideally, screening is conducted by two reviewers independently. That means Reviewer 1 screens the study independently, Reviewer 2 screens the same study independently. Neither reviewer should simply follow the other's decision. Then their decisions are compared.",
        ),
        p("Why? Independent screening helps reduce individual mistakes, subjective interpretation, and selection bias."),
        h(2, "What Happens When Reviewers Disagree?"),
        p("Suppose Reviewer 1 → Include, Reviewer 2 → Exclude. That is a disagreement. Do not simply let the first reviewer win."),
        p(b("Normal process:")),
        numbered([
          "Compare decisions",
          "Discuss the eligibility criteria",
          "Try to reach consensus",
          "If disagreement remains → third reviewer",
          "Document the resolution",
        ]),
        h(2, "A Practical Disagreement Example"),
        p(b("Study: "), t("450 adults with hypertension participated in an exercise intervention study.")),
        p(b("Reviewer 1: "), t("Include.")),
        p(b("Reviewer 2: "), t("Exclude: wrong study design.")),
        p(b("What should they do? "), t("They should return to the predefined study-design criterion.")),
        p(i('Not "I think this is a good study." Not "I think we should include it."')),
        p(b("Instead: "), t("what does our protocol say about eligible study designs? That is how disagreements should be resolved.")),
      ),
    },
    {
      title: "5.7 Difficult Screening Decisions",
      estimated_minutes: 10,
      summary:
        "Missing full text, insufficient reporting, and language barriers are not automatic exclusions: try reasonable routes to resolve them and document what you did.",
      body: doc(
        h(2, "What If the Full Text Is Missing?"),
        p("Sometimes you cannot obtain the full article. Do not automatically treat full text unavailable as not eligible."),
        p(
          "First try reasonable routes to obtain it. Document the attempts. If important eligibility information remains unavailable, the study may need to be classified appropriately rather than silently discarded.",
        ),
        h(2, "What If the Study Doesn't Give Enough Information?"),
        p("Sometimes an article does not clearly report: participant characteristics, intervention details, study design, outcome information."),
        p("It is recommended that you try contacting the study author/investigator where a study remains unclear."),
        p(b("SRN principle: "), t("unclear information is not the same thing as evidence that the study is ineligible.")),
        h(2, "Language Barriers"),
        p("A potentially eligible article may be published in another language. Possible approaches include: translation services, multilingual members of the review team."),
        p("Language restrictions should be considered carefully because they may introduce bias. Document how translation was handled."),
      ),
    },
    {
      title: "5.8 Multiple Reports of the Same Study",
      estimated_minutes: 10,
      summary:
        "One clinical trial can produce several papers. Treating them as independent studies risks counting the same participants multiple times: link the reports instead.",
      body: doc(
        p("This is an important lesson that beginners often miss."),
        h(2, "One Study Can Produce Several Papers"),
        p("Imagine one clinical trial. It may produce:"),
        bullets([
          "Paper A: baseline characteristics",
          "Paper B: primary outcome",
          "Paper C: long-term follow-up",
          "Paper D: secondary outcome",
        ]),
        p("These are four publications but potentially one underlying study."),
        p(b("The danger: "), t("if you treat them as four independent studies, you may count the same participants multiple times.")),
        h(2, "Link the Reports"),
        p("Look for clues such as:"),
        bullets(["trial registration number", "authors", "study setting", "sample size", "intervention", "recruitment period", "participant characteristics"]),
        p("Then link the publications together."),
        p(
          b("SRN principle: "),
          t("multiple reports may represent one study. Treat the underlying study as one study, while using information from the different reports where appropriate."),
        ),
      ),
    },
    {
      title: "5.9 Duplicates vs Multiple Reports",
      estimated_minutes: 6,
      summary: "A duplicate record is the same publication appearing twice; multiple reports are different publications from the same study. They're not the same problem.",
      body: doc(
        h(2, "These Are Not the Same Thing"),
        p(b("Duplicate record: "), t("the same publication appears more than once in your search results. Example: PubMed + Embase retrieve the same article. → Deduplication.")),
        p(b("Multiple reports: "), t("different publications arise from the same underlying study. Example: one clinical trial produces three journal articles. → Link the reports.")),
        p(b("Remember: "), t("duplicate records = same publication. Multiple reports = different publications, same study.")),
        p("This distinction will become extremely important when you move into data extraction and analysis."),
      ),
    },
    {
      title: "5.10 Screening Tools",
      estimated_minutes: 8,
      summary:
        "Covidence, Rayyan, EPPI-Reviewer, and others manage the workflow: but the reviewer still makes every eligibility decision.",
      body: doc(
        h(2, "You Don't Have to Use Excel"),
        p("Screening can be managed using different tools. Examples include:"),
        bullets(["Covidence", "Rayyan", "EPPI-Reviewer", "DistillerSR", "RevMan", "EndNote", "Zotero", "Excel-based templates"]),
        p(b("But remember: "), t("the software does not perform the methodological reasoning for you. You still need clearly defined eligibility criteria.")),
        h(2, "What Should the Tool Help You Do?"),
        p("A screening platform should ideally help you:"),
        bullets(["import records", "remove/manage duplicates", "screen titles and abstracts", "screen full texts", "record decisions", "manage disagreements", "record exclusion reasons", "track progress", "export results"]),
        p(b("SRN principle: "), t("the tool manages the workflow. The reviewer makes the eligibility decision.")),
      ),
    },
    {
      title: "5.11 AI-Assisted Screening",
      estimated_minutes: 6,
      summary: "AI can prioritise, sort, and reduce workload: but it does not replace methodological judgement.",
      body: doc(
        h(2, "Can AI Screen Studies?"),
        p("Yes, AI and machine-learning tools can assist with screening. They may:"),
        bullets(["prioritise potentially relevant studies", "identify patterns in titles and abstracts", "reduce manual workload", "assist with initial sorting"]),
        p(b("But: AI does not replace methodological judgement.")),
        p("AI can assist screening; it should not become an excuse to stop understanding your eligibility criteria."),
      ),
    },
    {
      title: "5.12 PRISMA: Telling the Story of Your Screening",
      estimated_minutes: 10,
      summary:
        "If your search found 5,000 records and your review included 12, the PRISMA flow diagram tells the reader exactly what happened to the other 4,988: and the numbers must be internally consistent.",
      body: doc(
        h(2, "Where Did All the Papers Go?"),
        p("Imagine your search produced 5,000 records. But your review finally included 12 studies. A reader will naturally ask: what happened to the other 4,988 records?"),
        p("The PRISMA flow diagram provides the answer."),
        h(2, "The PRISMA Flow Diagram"),
        numbered([
          "Records identified",
          "Duplicates removed",
          "Records screened",
          "Records excluded",
          "Reports sought for retrieval",
          "Reports not retrieved",
          "Full-text reports assessed",
          "Reports excluded",
          "Studies included",
          "Studies included in synthesis",
        ]),
        h(2, "Your Numbers Must Tell One Consistent Story"),
        p("For example:"),
        tableItem("Worked example", [
          ["Records identified", "4,562"],
          ["Duplicates removed", "610"],
          ["Records screened", "3,952"],
          ["Records excluded", "3,935"],
          ["Full texts assessed", "17"],
          ["Full texts excluded", "9"],
          ["Studies included", "8"],
        ]),
        p("These numbers must be internally consistent. You should be able to trace what happened to the records from identification to inclusion."),
      ),
    },
    {
      title: "5.13 Reporting Excluded Studies",
      estimated_minutes: 6,
      summary: "Not every excluded study needs to be listed: but use one primary reason per study, even if it violated several criteria.",
      body: doc(
        h(2, "Do You List Every Excluded Study?"),
        p("Not necessarily. For example:"),
        tableItem("Excluded studies example", [
          ["Smith 2020", "Wrong population"],
          ["Jones 2019", "Not an RCT"],
          ["Ahmed 2021", "Wrong intervention"],
          ["Lee 2018", "No eligible outcome"],
        ]),
        p(b("Important: "), t("use one primary reason for reporting purposes, even if a paper violates several criteria.")),
      ),
    },
    {
      title: "5.14 Studies Awaiting Classification",
      estimated_minutes: 6,
      summary:
        "Insufficient information or unresolved queries don't force a decision: a transparent \"unclear\" is better than an unsupported \"exclude.\"",
      body: doc(
        h(2, "What If You Still Cannot Decide?"),
        p("Sometimes you have: insufficient information, unresolved author queries, unclear study characteristics, uncertainty about whether two reports represent the same study."),
        p("Do not force a decision simply to make the numbers look neat."),
        p(b("SRN principle: "), t('a transparent "unclear" decision is better than an unsupported "exclude."')),
      ),
    },
    {
      title: "5.15 Putting Screening Into Practice",
      estimated_minutes: 15,
      summary:
        "Four worked screening decisions, from clearly eligible to genuinely ambiguous: some criteria are straightforward, others need the full text.",
      body: doc(
        h(2, "Screening Exercise 1: Title and Abstract"),
        p(b("Let's Screen Some Studies. Now we turn the criteria into decisions.")),
        p(b("Study A: "), t("30 adults aged 25–45 with mild-to-moderate depression, randomised to 8 weeks of Hatha yoga or wait-list control. Depression measured using BDI-II.")),
        p(b("Include / Potentially include. "), t("Why? It satisfies the core population, intervention, comparator, outcome and study-design requirements.")),
        p(b("Study B: "), t("qualitative interviews exploring the experiences of people using yoga to manage their mood.")),
        p(b("Exclude. "), t("Why? Wrong study design for this particular effectiveness review.")),
        p(b("Study C: "), t("comparison of different yoga styles on anxiety levels in the general population.")),
        p(b("Exclude. "), t("Why? Wrong population and wrong outcome.")),
        p(b("Study D: "), t("yoga and meditation versus antidepressant medication for severe depression in adults aged ≥65.")),
        p(b("Potentially eligible. "), t("But we need to check whether the combined intervention meets our yoga definition, the age criterion is acceptable, and the intervention can be separated sufficiently for our analysis.")),
        p(b("This demonstrates an important point: "), t("eligibility is sometimes straightforward. Sometimes you need the full text to make the decision.")),
        h(2, "Check Your Understanding"),
        ...selfCheck(
          "What are the two main stages of screening?",
          "Title/abstract screening and full-text screening.",
        ),
        ...selfCheck(
          "What should happen if consensus cannot be reached between two disagreeing reviewers?",
          "A third reviewer can arbitrate.",
        ),
        ...selfCheck(
          "What is the difference between a duplicate publication and multiple reports from the same study?",
          "A duplicate is the same publication appearing more than once in your results. Multiple reports are different publications arising from the same underlying study.",
        ),
        ...selfCheck(
          "Why should you record a specific reason for excluding a full-text article?",
          'A specific reason ("wrong population", "not an RCT") creates an audit trail and lets you report the selection process: "not relevant" does not.',
        ),
        ...selfCheck(
          "What is the purpose of a PRISMA flow diagram?",
          "It shows a reader what happened to every record, from identification through to the studies finally included, so the numbers can be traced and checked.",
        ),
      ),
    },
  ],
  quiz: {
    title: "Module 5 Quiz",
    pass_mark: 60,
    max_attempts: null,
    questions: [
      {
        prompt: "At title/abstract screening, what should you do when you are unsure whether a study is eligible?",
        explanation: 'The rule is "when in doubt, keep it": send it forward to full-text assessment rather than excluding on incomplete information.',
        options: [
          { label: "Exclude it" },
          { label: "Include it for full-text assessment", correct: true },
          { label: "Delete it" },
          { label: "Ask the author immediately" },
        ],
      },
      {
        prompt: "Two reviewers disagree about whether a study should be included. What should normally happen first?",
        explanation: "The normal process starts with comparing decisions and discussing the eligibility criteria to try to reach consensus, before escalating.",
        options: [
          { label: "Vote" },
          { label: "Lead author decides" },
          { label: "Discuss and attempt consensus", correct: true },
          { label: "Delete the study" },
        ],
      },
      {
        prompt:
          'Scenario: you have 2,000 records. A title says "Exercise and cardiovascular health in adults." The abstract does not clearly state whether the participants have hypertension, which is required by your eligibility criteria. What should you do?',
        explanation: "Insufficient information at title/abstract stage means unclear, not exclude: assess the full text before deciding.",
        options: [
          { label: "Exclude" },
          { label: "Include as a final study" },
          { label: "Mark unclear and assess the full text", correct: true },
          { label: "Search Google for the answer" },
        ],
      },
      {
        prompt:
          "Scenario: a study was published as three different papers. All three papers appear to describe the same clinical trial. What should you do?",
        explanation: "Multiple reports of one underlying study should be linked together, not counted as separate studies.",
        options: [
          { label: "Count them as three studies" },
          { label: "Exclude two automatically" },
          { label: "Link the publications as reports of the same underlying study", correct: true },
          { label: "Choose the paper with the best result" },
        ],
      },
    ],
  },
  assignment: {
    title: "Screen Your Own Review",
    pass_mark: 60,
    max_attempts: null,
    submission_type: "either",
    instructions: doc(
      p("Use the search results you generated in Module 4 to run a real screening exercise."),
      numbered([
        "Import your search results into your screening tool.",
        "Manage/remove duplicate records.",
        "Create your screening checklist.",
        "Pilot the checklist on a small sample.",
        "Revise the checklist if necessary.",
        "Conduct title/abstract screening.",
        "Mark each record: include, exclude, or unclear.",
        "Retrieve full texts for records passing Stage 1.",
        "Conduct full-text screening.",
        "Record a specific primary reason for every full-text exclusion.",
        "Identify possible multiple reports of the same study.",
        "Link multiple reports where necessary.",
        "Resolve disagreements with your second reviewer.",
        "Record unresolved studies appropriately.",
        "Complete your PRISMA flow numbers.",
      ]),
      h(2, "Your final output should include"),
      bullets([
        "Eligibility Screening Checklist: the final version used for screening.",
        "Pilot Screening Record: showing the initial pilot and any revisions.",
        "Title/Abstract Screening File: showing decisions for all records.",
        "Full-Text Screening File: showing decisions and reasons for exclusion.",
        "Excluded Studies List: with primary reasons for exclusion.",
        "Multiple-Report/Study-Linking Log: showing publications that belong to the same underlying study.",
        "Disagreement Log: showing conflicts and how they were resolved.",
        "PRISMA Screening Numbers: the numbers needed for the flow diagram.",
        "Final Included-Study List: the studies that have successfully passed screening.",
      ]),
    ),
  },
};

export const MODULE_6 = {
  title: "6. Extracting the Evidence",
  summary:
    "You have your included studies, each written up in its own way. Data extraction turns them into one structured, comparable dataset: the input for synthesis.",
  release_rule: "after_previous",
  contributors: ["Prof Ejaz Khan", "Dr Ekperoenne Esu", "Uthman Okikola Adebayo"],
  lessons: [
    {
      title: "6.1 What Is Data Extraction?",
      estimated_minutes: 10,
      summary:
        "Data extraction = finding, checking and recording the information you need from each included study, turning papers written in different formats into one structured dataset.",
      body: doc(
        h(2, "You Have the Studies. Now What?"),
        p(
          "You have searched the literature. You have screened the records. You have assessed the full texts. You now have your included studies.",
        ),
        p(
          "But the studies are written as individual papers. One paper may report its findings in a table. Another may use percentages. Another may use means and standard deviations. Another may report odds ratios.",
        ),
        p("Your job is to turn all of this information into a structured dataset. That process is called data extraction."),
        p(b("Data extraction = finding, checking and recording the information you need from each included study.")),
        h(2, "Where Does Extraction Fit?"),
        image(`${MEDIA_BASE}/academy-search-to-analysis-flow.png`, "A seven-step flow: database search, abstract screening, article retrieval, article screening, data extraction, synthesis, analysis."),
        caption("The seven-step flow from database search to analysis: from the SRN facilitator materials."),
        image(`${MEDIA_BASE}/academy-review-process-flowchart.png`, "A flowchart of the systematic review process: develop the research question and protocol, run the literature search, screen titles and abstracts, retrieve full texts, screen full texts, extract data, and write and report the results."),
        caption("The full review process, from research question to write-up: from the SRN facilitator materials."),
        numbered([
          "Research question",
          "Literature search",
          "Screening",
          "Eligible studies",
          "Data extraction",
          "Risk-of-bias assessment",
          "Evidence synthesis",
          "Conclusions",
        ]),
      ),
    },
    {
      title: "6.2 What Exactly Do We Extract?",
      estimated_minutes: 8,
      summary:
        "Your research question, not curiosity, determines what you extract. Extraction forms usually cover eight main categories.",
      body: doc(
        h(2, "Don't Extract Everything"),
        p("A common beginner mistake is to open a paper and start copying anything that looks interesting."),
        p(b("Don't. Your research question should determine what you extract.")),
        p(b("The question is: what information will I need to answer my review question?")),
        p("Your protocol should already help answer this. For intervention reviews, PICO can help: Population, Intervention, Comparator, Outcome."),
        p("Other review questions may use frameworks such as PEO, PIO, PICOS, SPIDER or PCC."),
        h(2, "The Main Categories"),
        p("Your extraction form will usually contain information about:"),
        numbered([
          "Study identification",
          "Study design and setting",
          "Participants",
          "Intervention or exposure",
          "Comparator",
          "Outcomes",
          "Results",
          "Other information relevant to your review",
        ]),
      ),
    },
    {
      title: "6.3 Extracting Study Characteristics",
      estimated_minutes: 10,
      summary:
        "A unique Study ID, plus study design, setting, and participant characteristics: collect what's relevant to your review, not every reported characteristic.",
      body: doc(
        h(2, "Identify the Study"),
        p("Start with information that tells you what study you are looking at. Possible fields include:"),
        tableItem("Study identification example", [
          ["Study ID", "ST001"],
          ["First author", "Smith"],
          ["Year", "2024"],
          ["Country", "Nigeria"],
        ]),
        p("A unique Study ID is particularly useful for tracking studies throughout the review."),
        h(2, "Study Design and Setting"),
        p("You may also need: study design, recruitment method, study setting, number of sites, study duration, follow-up period."),
        p("Examples of designs include: quantitative, qualitative, mixed methods, randomised controlled trial, cohort, case-control, cross-sectional. The exact fields depend on your review."),
        h(2, "Who Was Studied?"),
        p("Extract the participant characteristics relevant to your question. For example: sample size, age/age range, sex/gender, clinical characteristics, socioeconomic characteristics, relevant eligibility characteristics."),
        p(b("Important: "), t("do not automatically collect every characteristic reported by the authors. Collect the characteristics relevant to your review.")),
      ),
    },
    {
      title: "6.4 Extracting Interventions, Exposures and Comparators",
      estimated_minutes: 10,
      summary:
        "For interventions: type, components, duration, dose. For exposures: definition and measurement. Never create a comparator the study didn't have.",
      body: doc(
        h(2, "What Was Done?"),
        p("For intervention studies, you may need: intervention name/type, components, duration, frequency, dose/intensity, who delivered it, where it was delivered."),
        p("For observational studies, you may instead need: exposure, definition of exposure, how exposure was measured, duration or level of exposure."),
        h(2, "What Was the Comparator?"),
        p(b("Ask: compared with what?")),
        p("Possible comparators include: placebo, no intervention, another treatment, unexposed participants, lower exposure."),
        p(b("Critical rule: "), t("do not create a comparator that the study did not have. Some studies have no comparator.")),
      ),
    },
    {
      title: "6.5 Extracting Outcome Data",
      estimated_minutes: 10,
      summary:
        "Record outcome, definition, measurement tool, time point, and result: and record what the study reports before transforming or calculating anything.",
      body: doc(
        h(2, "What Is an Outcome?"),
        p(b("An outcome is what the researchers measured to determine what happened.")),
        p("Examples: mortality, blood pressure, depression score, employment, HIV testing uptake, examination scores."),
        p("For each important outcome, consider recording:"),
        p(b("Outcome → Definition → Measurement tool → Time point → Result")),
        h(2, "The Numbers Matter"),
        p("Results may appear as: number of participants, percentage/proportion, mean, standard deviation, median, interquartile range, risk ratio, odds ratio, hazard ratio."),
        p(b("Golden rule: "), t("record what the study reports before transforming or calculating anything.")),
        p("This is important because the learner will eventually need to distinguish reported data from data they have calculated themselves."),
      ),
    },
    {
      title: "6.6 Where Do You Find the Data?",
      estimated_minutes: 8,
      summary:
        "The abstract, methods, results, tables, supplementary material, and trial registrations can all hold data you need: the results section is not the only place.",
      body: doc(
        h(2, "The Results Section Is Not the Only Place"),
        p("You may need to look in:"),
        bullets([
          [b("Abstract: "), t("basic study information.")],
          [b("Methods: "), t("population, design, intervention and measurements.")],
          [b("Results: "), t("participants and findings.")],
          [b("Tables and figures: "), t("often contain the numerical data needed for analysis.")],
          [b("Supplementary material: "), t("may contain additional information.")],
          [b("Trial registrations/protocols: "), t("may clarify methods or outcomes.")],
        ]),
        h(2, "Interactive Exercise"),
        p("Take a research paper and find: the sample size, then the primary outcome, then the result for the primary outcome."),
        p('This is a much better beginner exercise than simply asking them to define "data extraction."'),
      ),
    },
    {
      title: "6.7 Build Your Data Extraction Form",
      estimated_minutes: 10,
      summary:
        "A structured template telling you what to collect from every study. The software (Excel, REDCap, Covidence, or otherwise) is secondary to a clear, consistent process.",
      body: doc(
        h(2, "Your Extraction Form Is Your Data Collection Tool"),
        p("A data extraction form is a structured template that tells you what information to collect from every included study."),
        p("It could be created using: Excel, Google Sheets, Word, REDCap, Covidence, DistillerSR, EPPI-Reviewer, other systematic-review software."),
        p(b("The software is secondary. What matters is having a clear and consistent extraction process.")),
        h(2, "Example Extraction Form"),
        tableItem("ST001: Nigeria", [
          ["Design", "RCT"],
          ["Sample", "200"],
          ["Population", "Adults"],
          ["Intervention", "SMS"],
          ["Comparator", "Usual care"],
          ["Outcome", "Attendance"],
          ["Result", "78% vs 61%"],
        ]),
        tableItem("ST002: Rwanda", [
          ["Design", "Cohort"],
          ["Sample", "450"],
          ["Population", "Adolescents"],
          ["Intervention", "—"],
          ["Comparator", "—"],
          ["Outcome", "HIV testing"],
          ["Result", "67%"],
        ]),
      ),
    },
    {
      title: "6.8 Design Before You Extract",
      estimated_minutes: 8,
      summary:
        "Open-paper-and-copy-what-looks-interesting creates inconsistent data across studies. Decide your variables from the protocol first, then pilot the form.",
      body: doc(
        h(2, "The Wrong Way"),
        numbered(["Open paper", "Read paper", "See something interesting", "Copy it into Excel", "Repeat"]),
        p("This seems easy. It creates problems. Different studies may be recorded differently, and reviewers may start collecting different information."),
        h(2, "The Better Way"),
        numbered(["Review question", "Protocol", "Decide variables", "Create extraction form", "Pilot form", "Revise", "Full extraction"]),
        h(2, "Pilot the Form"),
        p("Before extracting every study, test the form on approximately 2–5 studies. Ask:"),
        bullets([
          "Are important fields missing?",
          "Are some fields unnecessary?",
          "Are the instructions clear?",
          "Are reviewers interpreting fields consistently?",
          "Can the study results actually be recorded?",
        ]),
        p("Then revise the form."),
      ),
    },
    {
      title: "6.9 Handling Difficult Data",
      estimated_minutes: 10,
      summary:
        "Never guess a missing value. Use NR, NA, or Unclear, and flag conflicting numbers rather than silently choosing one.",
      body: doc(
        h(2, "What If the Data Are Missing?"),
        p("First, check the entire paper. Then check tables and figures. Then check supplementary material. Then check related publications or protocols."),
        p("If essential information is still unavailable: consider contacting the authors."),
        h(2, "Never Guess"),
        p("Use clear codes such as:"),
        bullets([
          "NR = Not reported",
          "NA = Not applicable",
          "Unclear = Information is present but cannot be confidently interpreted",
        ]),
        p(i('Never do this: "The paper probably meant 50."')),
        p(b("Do this: NR, or Unclear.")),
        h(2, "Conflicting Information"),
        p('What if the paper says "Table: 120 participants" but the text says "118 participants"?'),
        p("Don't simply choose one. Flag the discrepancy. Check: methods, results, tables, supplementary material, related publications."),
        p("Then follow your predefined decision rule and document the decision."),
      ),
    },
    {
      title: "6.10 Extracting Data Without Introducing Errors",
      estimated_minutes: 8,
      summary:
        "Common mistakes to avoid, and the difference between data extraction (what happened) and risk-of-bias assessment (how much to trust it).",
      body: doc(
        h(2, "Common Mistakes"),
        p("Avoid:"),
        bullets([
          "extracting everything in the paper",
          "changing definitions midway",
          "copying information without checking context",
          "mixing baseline and follow-up results",
          "confusing percentages with participant counts",
          "confusing SD with SE",
          "mixing adjusted and unadjusted estimates",
          "treating multiple reports from one study as separate studies",
          "leaving unclear cells blank",
          "failing to verify extracted values",
        ]),
        h(2, "Data Extraction Is Not Risk-of-Bias Assessment"),
        p(b("Data extraction asks: "), t("what did the study do and what did it find?")),
        p(b("Risk-of-bias assessment asks: "), t("how much confidence should we have that the study's methods protected its findings from bias?")),
        p("They are related. They are not the same task."),
      ),
    },
    {
      title: "6.11 Quality Control: Who Extracts the Data?",
      estimated_minutes: 10,
      summary:
        "Ideally two reviewers, independently or with a check-and-compare step. Disagreements go back to the paper: never averaged, never guessed.",
      body: doc(
        h(2, "One Reviewer or Two?"),
        p("Ideally, extraction involves more than one reviewer. One approach: Reviewer 1 extracts data, Reviewer 2 checks extraction, then disagreements are resolved."),
        p("Another: Reviewer 1 and Reviewer 2 each extract independently, then their results are compared."),
        h(2, "When Reviewers Disagree"),
        p("Don't average the values. Don't guess. Instead:"),
        numbered([
          "Return to the original paper.",
          "Check the extraction instructions.",
          "Discuss the interpretation.",
          "Agree on the correct value.",
          "Use a third reviewer if necessary.",
          "Document important decisions.",
        ]),
        p(b("The paper, not the reviewer, is the primary source of truth.")),
      ),
    },
    {
      title: "6.12 Data in Different Formats",
      estimated_minutes: 8,
      summary:
        "Studies report evidence in different statistical languages: means, medians, odds ratios, raw counts. Understand what the numbers represent before converting anything.",
      body: doc(
        h(2, "Studies Don't Always Speak the Same Statistical Language"),
        bullets([
          "Study A: Mean = 72.4, SD = 8.2",
          "Study B: Median = 71, IQR = 65–78",
          "Study C: OR = 1.72, 95% CI 1.20–2.45",
          "Study D: 64/100 participants experienced the outcome",
        ]),
        p("They are all reporting evidence, but not in the same format."),
        p(b("Important beginner message: "), t("do not start converting numbers just because they look different. First understand what the numbers represent.")),
      ),
    },
    {
      title: "6.13 Multiple Reports and Study IDs",
      estimated_minutes: 6,
      summary:
        "Your extraction form should distinguish the underlying Study ID from each Report ID, so one study's several papers don't get mistaken for several studies.",
      body: doc(
        h(2, "One Study Can Have Several Papers"),
        p("Suppose Study A produces: Paper 1: baseline characteristics, Paper 2: primary outcome, Paper 3: long-term follow-up."),
        p("Your extraction form should allow you to distinguish:"),
        bullets(["Study ID: ST001", "Report ID: ST001-R1", "Report ID: ST001-R2", "Report ID: ST001-R3"]),
      ),
    },
    {
      title: "6.14 Can AI Extract Data?",
      estimated_minutes: 6,
      summary:
        "AI can help locate and organise information, but it can also misread tables and invent values: humans remain responsible for verification.",
      body: doc(
        h(2, "AI Can Help"),
        p("AI tools may help you: locate information in long papers, identify potential values, organise extracted information."),
        p("But AI may also: misread tables, confuse study groups, misunderstand statistical values, invent information that is not reported."),
        p(b("AI can assist extraction. Humans remain responsible for verification.")),
      ),
    },
    {
      title: "6.15 Data Extraction in Practice",
      estimated_minutes: 10,
      summary:
        "Putting the module together: build your evidence dataset from the studies that survived screening, verified and cleaned.",
      body: doc(
        h(2, "Build Your Evidence Dataset"),
        p(
          "Take the studies that survived Module 5's screening, and build the final, cleaned evidence dataset: the input for synthesis in the next stage of your review.",
        ),
        h(2, "Check Your Understanding"),
        ...selfCheck(
          "Why should you not simply extract everything reported in a paper?",
          "Because the review question and protocol determine what information is needed.",
        ),
        ...selfCheck("What does NR mean?", "Not reported."),
        ...selfCheck("Should you invent a missing value if you can make a reasonable guess?", "No."),
        ...selfCheck(
          "Why might a study have both a Study ID and a Report ID?",
          "The Study ID identifies the underlying study; each Report ID identifies one of its several published papers, so they don't get miscounted as separate studies.",
        ),
        ...selfCheck(
          "Can AI be used for data extraction?",
          "Yes, as an assistive tool, but extracted information must be human-verified.",
        ),
      ),
    },
  ],
  quiz: {
    title: "Module 6 Quiz",
    pass_mark: 60,
    max_attempts: null,
    questions: [
      {
        prompt: "Which of the following may be extracted from an included study?",
        explanation: "An extraction form typically covers all of these categories: study, participant, intervention/exposure, and outcome/result information.",
        options: [
          { label: "Study characteristics" },
          { label: "Participant characteristics" },
          { label: "Intervention/exposure" },
          { label: "Outcomes and results" },
          { label: "All of the above", correct: true },
        ],
      },
    ],
  },
  assignment: {
    title: "Build Your Evidence Dataset",
    pass_mark: 60,
    max_attempts: null,
    submission_type: "either",
    instructions: doc(
      p("Take the studies that survived Module 5's screening and build your final evidence dataset."),
      numbered([
        "Create a Study ID for every included study.",
        "Create the extraction form.",
        "Define what every field means.",
        "Pilot the form using 2–5 studies.",
        "Revise the form.",
        "Extract study characteristics.",
        "Extract intervention/exposure and comparator information.",
        "Extract outcome definitions and measurement methods.",
        "Extract the reported results.",
        "Record the source of important extracted information.",
        "Mark missing information as NR, NA or Unclear rather than guessing.",
        "Identify multiple reports from the same underlying study.",
        "Perform verification/checking.",
        "Resolve disagreements.",
        "Produce the final cleaned extraction dataset.",
      ]),
      h(2, "Your final output should include"),
      bullets([
        "Data Extraction Form: the final form used in the review.",
        "Extraction Guidance: short instructions explaining what each field means.",
        "Pilot Record: evidence that the form was tested and revised.",
        "Study Characteristics Table",
        "Outcome Data Table",
        "Missing Data Log",
        "Multiple-Report/Study-Linking Log",
        "Verification/Disagreement Record",
        "Final Evidence Dataset: this becomes the input for evidence synthesis.",
      ]),
    ),
  },
};

export const MODULE_7 = {
  title: "7. Developing the Systematic Review Protocol",
  summary:
    "A short module bringing together everything built so far into one written plan, your protocol, and understanding how to register it.",
  release_rule: "after_previous",
  contributors: ["Prof Ejaz Khan", "Dr Buna Bhandari"],
  lessons: [
    {
      title: "7.1 What Is a Systematic Review Protocol?",
      estimated_minutes: 8,
      summary:
        "A protocol is the written plan for how you intend to conduct your review: developed before the main review methods are carried out.",
      body: doc(
        h(2, "Your Plan Before the Review"),
        p("A systematic review protocol is the written plan for how you intend to conduct your review. It describes, in advance:"),
        bullets([
          "What are we reviewing?",
          "Which studies will be eligible?",
          "How will we search for them?",
          "How will we select them?",
          "What information will we extract?",
          "How will we assess and analyse the evidence?",
        ]),
        p(b("The protocol should be developed before the main review methods are carried out. Think of it as the blueprint for your systematic review.")),
        numbered(["Research question", "Protocol: the plan", "Conduct the review", "Report the review"]),
      ),
    },
    {
      title: "7.2 Why Do We Need a Protocol?",
      estimated_minutes: 8,
      summary:
        "A protocol forces methodological decisions before the findings can influence them: reducing arbitrary, post-hoc changes and easing the final report.",
      body: doc(
        h(2, "Decide Before You Know the Answers"),
        p(
          "Imagine that you begin a review without clearly deciding your methods. Halfway through screening, you change the eligibility criteria. After seeing the results, you decide to analyse a different outcome. You add or remove methods depending on what the evidence looks like.",
        ),
        p("That creates a problem."),
        p(b("A protocol encourages you to make important methodological decisions before those decisions can be influenced by the findings.")),
        p("A protocol can therefore help:"),
        bullets([
          "guide the review team",
          "reduce arbitrary or post-hoc decisions",
          "reduce unnecessary duplication",
          "improve consistency among reviewers",
          "plan tasks and resources",
          "make the eventual review easier to report",
        ]),
        p(b("SRN principle: "), t("plan the review before the evidence starts influencing your decisions.")),
      ),
    },
    {
      title: "7.3 What Goes Into the Protocol?",
      estimated_minutes: 12,
      summary:
        "You have already built most of it. A nine-section SRN protocol structure brings together everything from Modules 1–6.",
      body: doc(
        h(2, "You Have Already Built Most of It"),
        p(b("Here is the good news: you have already developed much of your protocol during this academy.")),
        p("A protocol typically brings together:"),
        tableItem("Where each section came from", [
          ["Background and rationale", "Module 1"],
          ["Review question/objectives", "Module 1"],
          ["Eligibility criteria", "Module 2"],
          ["Search strategy and databases", "Module 4"],
          ["Screening and study selection", "Module 5"],
          ["Data extraction and management", "Module 6"],
          ["Risk-of-bias approach", "To be specified for the review"],
          ["Evidence synthesis/analysis plan", "To be specified before analysis"],
        ]),
        p(b("Key idea: "), t("the protocol is not another completely separate piece of work. It is the document that brings your planned methods together in one place.")),
        h(2, "A Simple SRN Protocol Structure"),
        numbered([
          "Title: what is the review about?",
          "Background and rationale: what is already known, what problem or uncertainty remains, why this review is needed.",
          "Review question and objectives: state exactly what the review intends to answer.",
          "Eligibility criteria: specify which studies will and will not be eligible.",
          "Information sources and search strategy: databases, other information sources, planned search approach.",
          "Study-selection process: title/abstract screening, full-text screening, number of reviewers, how disagreements will be resolved.",
          "Data extraction: what information will be extracted, who will extract/check it, how missing or unclear information will be handled.",
          "Risk-of-bias assessment: identify the approach/tool appropriate to the included study designs.",
          "Evidence synthesis: state whether you plan narrative synthesis, meta-analysis where appropriate, or another suitable synthesis approach.",
        ]),
      ),
    },
    {
      title: "7.4 Registering Your Protocol",
      estimated_minutes: 8,
      summary:
        "Registration makes the plan visible and reduces duplication: and it is not the same thing as publishing the protocol as a journal article.",
      body: doc(
        h(2, "Make the Plan Visible"),
        p("Once the protocol has been developed, it may be registered in an appropriate review registry or repository."),
        p("Protocol registration creates a public record that the review is being planned or conducted."),
        p("Several possible routes, including: PROSPERO, OSF, Cochrane, JBI, depending on the review and context."),
        p(b("Why register? "), t("registration can help make the planned review visible and reduce unnecessary duplication.")),
        h(2, "Registration Is Not the Same as Publication"),
        p(b("Protocol registration: "), t("you enter details of the planned review into an appropriate registry or repository.")),
        p(b("Protocol publication: "), t("you prepare the protocol as a manuscript and publish it in a journal.")),
        p("These are not the same thing. A protocol may be registered without being published as a journal article."),
        p(b("SRN note: "), t("not every protocol needs to become a separate journal article.")),
        h(2, "Check Your Understanding"),
        ...selfCheck(
          "What is the main purpose of a systematic review protocol?",
          "To document the planned methods of the review before conducting the review.",
        ),
        ...selfCheck(
          "True or false: a protocol should ideally be developed only after screening studies so that the researchers know what methods will work.",
          "False.",
        ),
        ...selfCheck(
          "Why is developing the protocol in advance important?",
          "It helps reduce arbitrary decisions and provides a predefined plan for conducting the review.",
        ),
        ...selfCheck(
          "Is registering a protocol the same as publishing a protocol article?",
          "No.",
        ),
      ),
    },
  ],
  quiz: {
    title: "Module 7 Knowledge Check",
    pass_mark: 60,
    max_attempts: null,
    questions: [
      {
        prompt: "Which of the following belongs in a systematic review protocol?",
        explanation: "A protocol brings together the eligibility criteria, search strategy, data-extraction approach, and planned synthesis in one place.",
        options: [
          { label: "Eligibility criteria" },
          { label: "Search strategy" },
          { label: "Data-extraction approach" },
          { label: "Planned synthesis" },
          { label: "All of the above", correct: true },
        ],
      },
    ],
  },
  assignment: {
    title: "Assemble Your Protocol",
    pass_mark: 60,
    max_attempts: null,
    submission_type: "text",
    instructions: doc(
      p("Take the work you have already completed across Modules 1–6 and assemble it into one protocol document."),
      numbered([
        "Insert your review title.",
        "Add your background/rationale.",
        "Add your research question and objectives.",
        "Insert your eligibility criteria.",
        "Insert your planned information sources/search strategy.",
        "Describe your screening process.",
        "Insert your data-extraction plan.",
        "State your planned risk-of-bias method.",
        "State your planned synthesis approach.",
        "Identify where the protocol could appropriately be registered.",
      ]),
      p("That's it. This is essentially your previous academy work converted into a coherent review plan."),
      h(2, "Submit: SRN Systematic Review Protocol, Version 1.0, containing"),
      numbered([
        "Title",
        "Background/rationale",
        "Review question/objectives",
        "Eligibility criteria",
        "Search plan",
        "Study-selection plan",
        "Data-extraction plan",
        "Risk-of-bias plan",
        "Evidence-synthesis plan",
        "Protocol registration information",
      ]),
    ),
  },
};

export { t, b, i, p, h, bullets, numbered, quote, doc, selfCheck, tableItem, image, caption };
