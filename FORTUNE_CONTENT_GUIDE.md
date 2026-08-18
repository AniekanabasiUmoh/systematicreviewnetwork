# Updating the SRN website

A short guide to adding events and news posts yourself, and a note on what you
can and cannot change from the admin.

---

## 1. Signing in

Go to **systematicreviewsnetwork.org/admin** and sign in with your email and
password.

Forgotten it? Use "Forgot password" on that page. The reset link arrives by
email and lasts one hour. If it does not arrive within a few minutes, check
your spam folder before asking for another.

---

## 2. Adding an event

Events are workshops, webinars, courses and mentorship intakes — anything with
a date that people can register for.

**Admin → Content → Events → New event.**

The fields that matter:

| Field | What to put |
|---|---|
| **Title** | The name people will see. "Getting Started with Systematic Reviews" |
| **URL slug** | Fills in automatically from the title. Leave it alone unless you have a reason. |
| **Event type** | Webinar, course, mentorship or workshop. Controls the label on the card. |
| **Starts / Ends** | Date and time. Ends can be left blank for a single session. |
| **Format** | Online or in person. |
| **Location or joining link** | The venue, or the Zoom link. |
| **Registration opens / closes** | Optional. Leave blank to accept registrations right up to the start. |
| **Capacity** | Optional. Set it and the site counts seats and closes registration when full. |
| **Price** | Leave blank or enter 0 for a free event. Otherwise the amount **in kobo** — ₦5,000 is `500000`. |
| **Banner image** | Optional. Pick from the media library or upload one. |
| **Description** | The main body. See the editor notes below. |

### Save as a draft first

There are two buttons: **Save as draft** and **Publish**.

- **Draft** — saved, visible only to you. Nobody outside SRN can see it.
- **Published** — live on the site within about a minute.

Save as a draft, look at it, then publish when you are happy. You can unpublish
at any time by switching it back to draft.

### Where it appears

A published event shows on the homepage, on **/news**, and on its own page at
`/news/events/your-slug`. Registrations arrive under
**Admin → Operations → Registrations & submissions**.

---

## 3. Adding a news post

News posts are announcements and blog articles — no date to register for, just
something to say.

**Admin → Content → News → New post.**

Title, URL slug, author, published date, featured image, a short excerpt for
the listing card, and the body.

**One thing to watch:** setting the published date in the future does **not**
hide a post. Only the draft/published switch controls visibility. If you are
writing something ahead of time, leave it as a draft until the day.

---

## 4. The editor

The body field is a proper editor. The toolbar gives you headings, **bold**,
lists, links, and images.

**Headings:** use Heading 2 for the main sections of a post. The page title is
already a Heading 1, so starting at 2 keeps the structure right for screen
readers and for Google.

**Images:** the image button opens the media library. Anything you upload there
can be reused on any other page. Always fill in the description box when you
upload — it is what a blind reader hears, and what shows if the image fails to
load.

**Videos:** paste a YouTube link using the embed button and it will play inside
the page. Zoom recording links work the same way. A Zoom *joining* link is
deliberately never embedded — it is shown as a button instead, so that a live
session link on a public page cannot be walked into by anyone who finds it.

---

## 5. What you can and cannot edit

**You can edit these yourself:**

- Programmes
- Events
- News
- Resources (guides, templates, publications, recorded webinars)
- Team members
- Partners
- Testimonials
- Media library

**You cannot edit these from the admin:**

- The homepage wording
- The About, FAQ, Privacy and Terms pages
- The impact statistics and the map
- Page headings and introductions across the site
- Contact details

These were deliberately kept out of the admin: they are the site's structural
copy rather than day-to-day content, and an accidental edit to the homepage is
a lot more visible than an accidental edit to one news post. Email your
developer for changes to any of them — they are quick to do.

---

## 6. House style

A few conventions the site follows. Worth matching so new content does not look
bolted on.

- **No em dashes** (—). Use a comma, or start a new sentence. If a sentence
  needs a dash to hold together, it usually wants splitting in two.
- **Sentence case for headings.** "Getting started with systematic reviews",
  not "Getting Started With Systematic Reviews".
- **UK spelling.** Programme, organisation, analyse.
- **Write plainly.** The site's voice is confident and unfussy. Say what a
  thing is and who it is for.
- **Always describe your images.** Every upload needs a description.

---

## 7. If something looks wrong

Changes take up to a minute to appear on the live site. If a change has not
shown after a couple of minutes, hard-refresh the page (Ctrl+Shift+R).

If it still looks wrong, do not try to fix it by deleting and re-creating the
item — that loses any registrations attached to it. Email your developer with
the page address and what you expected to see.
