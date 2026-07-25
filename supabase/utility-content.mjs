import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/* Sprint 2.7 — real copy for the three utility pages (Option B: no
   [PLACEHOLDER] on the public site). These are grounded in the site's actual
   data practices — the forms it runs (newsletter, contact, event registration,
   donations), and the processors named in Design.md §11/§13 (Supabase hosting,
   Paystack for payments, Resend for email). No invented legal-entity details,
   no fake registration numbers; contact is the info@ address already on site. */

const env = Object.fromEntries(
  readFileSync(".env", "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const i = l.indexOf("=");
    return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
  }),
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const t = (text, marks) => (marks ? { type: "text", text, marks } : { type: "text", text });
const link = (text, href) => t(text, [{ type: "link", attrs: { href } }]);
const p = (...nodes) => ({ type: "paragraph", content: nodes.map((x) => (typeof x === "string" ? t(x) : x)) });
const h2 = (text) => ({ type: "heading", attrs: { level: 2 }, content: [t(text)] });
const h3 = (text) => ({ type: "heading", attrs: { level: 3 }, content: [t(text)] });
const bullets = (...items) => ({
  type: "bulletList",
  content: items.map((it) => ({
    type: "listItem",
    content: [{ type: "paragraph", content: (Array.isArray(it) ? it : [it]).map((x) => (typeof x === "string" ? t(x) : x)) }],
  })),
});
const doc = (...content) => ({ type: "doc", content });
const MAIL = "mailto:info@systematicreviewsnetwork.org";

/* ── Privacy ────────────────────────────────────────────────────────────── */
const privacy = doc(
  p(
    "This policy explains what personal information the Systematic Reviews ",
    "Network (SRN) collects through this website, why we collect it, and the ",
    "choices you have. We collect only what we need to run our training, events, ",
    "and communications — nothing is sold, and nothing is shared for advertising.",
  ),
  h2("What we collect"),
  p("We only hold information you give us directly, through one of our forms:"),
  bullets(
    ["When you ", t("register for an event", [{ type: "bold" }]), ": your name, email, institution, and country."],
    ["When you ", t("apply to a programme", [{ type: "bold" }]), ": the same details plus your motivation for applying."],
    ["When you ", t("join the newsletter", [{ type: "bold" }]), ": your email address."],
    ["When you ", t("contact us", [{ type: "bold" }]), " or enquire about a partnership: your name, email, and message."],
    ["When you ", t("donate", [{ type: "bold" }]), ": your name (or nothing, if you give anonymously), email, and any message. Card details are handled entirely by our payment processor and never reach our servers."],
  ),
  h2("Why we use it"),
  p(
    "We use your information to confirm registrations, review applications, send ",
    "the occasional newsletter you asked for, reply to your messages, and issue ",
    "donation receipts. We do not use it to build advertising profiles, and we do ",
    "not make automated decisions about you.",
  ),
  h2("Who processes it"),
  p(
    "We keep your data with a small number of trusted providers who act on our ",
    "instructions:",
  ),
  bullets(
    ["Our database and file storage are hosted on ", link("Supabase", "https://supabase.com/privacy"), "."],
    ["Payments and donations are processed by ", link("Paystack", "https://paystack.com/terms"), ", which handles card details directly; we receive only a confirmation and a reference."],
    ["Confirmation and newsletter emails are sent through ", link("Resend", "https://resend.com/legal/privacy-policy"), "."],
  ),
  h2("How long we keep it"),
  p(
    "We keep registration and application records for as long as we need them to ",
    "run the programme and meet our reporting obligations, and newsletter ",
    "subscriptions until you unsubscribe. You can ask us to delete your details at ",
    "any time, except where we are required to retain a record (for example, a ",
    "payment reference).",
  ),
  h2("Your choices"),
  p(
    "You can unsubscribe from the newsletter using the link in any email, and you ",
    "can ask us to see, correct, or delete the information we hold about you. To do ",
    "any of these, email us at ",
    link("info@systematicreviewsnetwork.org", MAIL),
    ".",
  ),
  h2("Cookies"),
  p(
    "This site does not use advertising or tracking cookies. We use only what is ",
    "needed for the site and secure checkout to work.",
  ),
  h2("Changes to this policy"),
  p(
    "We may update this policy as our services change. When we do, we will revise ",
    "the date shown on this page.",
  ),
);

/* ── Terms ──────────────────────────────────────────────────────────────── */
const terms = doc(
  p(
    "These terms cover your use of the Systematic Reviews Network (SRN) website ",
    "and the services offered through it — training, events, mentorship, resources, ",
    "and donations. By using the site you agree to them.",
  ),
  h2("Using this website"),
  p(
    "You may use this site to learn about our work, register for events, apply to ",
    "programmes, download resources, and support us. You agree not to misuse the ",
    "site — no attempting to disrupt it, gain unauthorised access, or submit false ",
    "information through our forms.",
  ),
  h2("Registrations and applications"),
  p(
    "Registering for an event or applying to a programme is a request for a place, ",
    "not a guarantee of one. Places are limited and, for some programmes, subject to ",
    "review. We confirm your place by email; until you receive that confirmation, a ",
    "place is not held.",
  ),
  h2("Payments and refunds"),
  p(
    "Some events carry a fee, shown clearly before you register. Payment is taken ",
    "through our payment processor, Paystack. For paid events, your place is held ",
    "only once payment is confirmed. Refunds and cancellations are handled case by ",
    "case — contact us at ",
    link("info@systematicreviewsnetwork.org", MAIL),
    " if your circumstances change.",
  ),
  h2("Donations"),
  p(
    "Donations are voluntary and, unless we agree otherwise in writing, ",
    "non-refundable. They support SRN's training and capacity-building work.",
  ),
  h2("Resources and intellectual property"),
  p(
    "The guides, templates, and recorded sessions we publish are free to use for ",
    "your own research and teaching. Please credit SRN and do not present our ",
    "materials as your own or resell them. The SRN name and logo remain ours.",
  ),
  h2("Accuracy and availability"),
  p(
    "We work to keep the information on this site accurate and the site available, ",
    "but we cannot guarantee it will always be error-free or uninterrupted. Event ",
    "details can change; we will tell registered participants of material changes.",
  ),
  h2("Liability"),
  p(
    "Our training is provided in good faith to build research skills. To the extent ",
    "the law allows, SRN is not liable for indirect or consequential loss arising ",
    "from your use of the site or our materials.",
  ),
  h2("Contact"),
  p(
    "Questions about these terms are welcome at ",
    link("info@systematicreviewsnetwork.org", MAIL),
    ".",
  ),
);

/* ── FAQ ─── heading (level 3) = question, following blocks = answer ─────── */
const faq = doc(
  h3("Who is SRN for?"),
  p(
    "Our programmes are built for researchers, clinicians, and postgraduate ",
    "students who want to produce trustworthy systematic reviews and meta-analyses ",
    "— particularly in settings where methodological support has been hard to reach. ",
    "You don't need prior review experience to start with our beginner course.",
  ),

  h3("Do I need experience to take a course?"),
  p(
    "No. The Beginner Academy assumes no prior systematic-review experience and ",
    "takes you from a research idea to a registered protocol and a working search. ",
    "Our advanced workshops and mentorship are for people who already have the ",
    "basics and want to go further.",
  ),

  h3("Are your courses free?"),
  p(
    "Some are, and some carry a fee. Webinars are typically free; hands-on courses ",
    "and workshops usually have a fee that covers delivery. The cost of every event ",
    "is shown clearly on its page before you register — and where it says Free, it ",
    "is genuinely free.",
  ),

  h3("How do I register for an event?"),
  p(
    "Each event has its own page under ",
    link("News & Events", "/news"),
    ", with the dates, format, cost, and how many places remain. When registration ",
    "is open you can sign up from that page; if it hasn't opened yet, you can join ",
    "the newsletter to hear the moment it does.",
  ),

  h3("What is the Mentorship Programme?"),
  p(
    "Mentorship pairs you with an experienced reviewer who guides you through a ",
    "complete, live review — from framing the question to submitting the manuscript. ",
    "Unlike a course, it follows your own project. You can read more on the ",
    link("Mentorship page", "/programmes/mentorship"),
    ".",
  ),

  h3("Where does SRN work?"),
  p(
    "The network began between two universities and now reaches researchers across ",
    "Africa, South Asia, and Latin America. You can see where on our ",
    link("Impact page", "/impact"),
    ". Most training is delivered online, so you can take part from anywhere.",
  ),

  h3("Can my institution host a training?"),
  p(
    "Yes — hosting a workshop or sponsoring places for your researchers is one of ",
    "the main ways partners work with us. See ",
    link("Partner with SRN", "/partner"),
    " for the options, or get in touch to discuss what you have in mind.",
  ),

  h3("How can I support SRN's work?"),
  p(
    "You can partner with us, sponsor researchers or a whole cohort, or make a ",
    "donation of any size. Every contribution extends where evidence skills can take ",
    "root next. Start on the ",
    link("Partner with SRN", "/partner"),
    " page.",
  ),
);

const updates = [
  ["privacy", privacy],
  ["terms", terms],
  ["faq", faq],
];

for (const [slug, body_rich] of updates) {
  const { error } = await db.from("pages").update({ body_rich }).eq("slug", slug);
  console.log(slug, error ? "ERROR " + error.message : "ok");
}
