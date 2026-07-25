import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Section, Prose } from "@/components/ui/Section";
import { PageHeader } from "@/components/ui/PageHeader";
import { RichText, richTextIsEmpty } from "@/components/ui/RichText";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";
import { getPageBySlug } from "@/lib/queries";

/* Sprint 2.7 — FAQ. The content lives in `pages` under the `faq` slug like any
   other editable page, but it renders as an accessible disclosure list rather
   than flat prose. The convention: each level-3 heading in the body is a
   question, and every block after it (until the next heading) is its answer.
   Staff edit questions and answers as ordinary headings and paragraphs; the
   accordion structure is derived here, so the page stays fully data-driven. */

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Frequently asked questions",
  description:
    "Answers to common questions about SRN's courses, mentorship, events, and how to get involved.",
};

type Node = { type: string; content?: Node[]; attrs?: { level?: number } | null };

/** Splits the flat body into question/answer groups at each heading. */
function toFaqItems(body: unknown): { question: string; answer: Node }[] {
  const doc = body as Node | null;
  if (!doc || !Array.isArray(doc.content)) return [];

  const items: { question: string; answer: Node }[] = [];
  let current: { question: string; blocks: Node[] } | null = null;

  const textOf = (n: Node): string =>
    (n.content ?? []).map((c) => (c.type === "text" ? (c as { text?: string }).text ?? "" : textOf(c))).join("");

  for (const node of doc.content) {
    if (node.type === "heading") {
      if (current) items.push({ question: current.question, answer: { type: "doc", content: current.blocks } });
      current = { question: textOf(node), blocks: [] };
    } else if (current) {
      current.blocks.push(node);
    }
  }
  if (current) items.push({ question: current.question, answer: { type: "doc", content: current.blocks } });

  return items.filter((i) => i.question.trim().length > 0);
}

export default async function FaqPage() {
  const page = await getPageBySlug("faq");
  if (!page || richTextIsEmpty(page.body_rich)) notFound();

  const items = toFaqItems(page.body_rich);

  return (
    <>
      <PageHeader
        eyebrow="Help"
        title={page.title}
        lede="Short answers to the questions we hear most. Can't find yours? Get in touch and we'll help."
      />

      <Section surface="paper">
        <Prose>
          {items.length > 0 ? (
            <Accordion>
              {items.map((item, i) => (
                <AccordionItem key={i} question={item.question}>
                  <RichText body={item.answer} />
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            /* If the body isn't structured as headings, fall back to rendering
               it whole rather than showing an empty accordion. */
            <RichText body={page.body_rich} />
          )}
        </Prose>
      </Section>
    </>
  );
}
