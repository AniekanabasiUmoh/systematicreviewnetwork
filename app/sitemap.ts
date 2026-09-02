import type { MetadataRoute } from "next";
import {
  getAllEvents,
  getAllNews,
  getImpactStories,
  getProgrammes,
  getResources,
} from "@/lib/queries";
import { getCourseSlugs } from "@/lib/academy/courses";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const url = (path: string) => new URL(path, siteUrl).toString();

/**
 * Keep public content discoverable without exposing admin, account, enrolment,
 * verification, or course-player routes to search engines.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [programmes, resources, events, news, stories, courses] = await Promise.all([
    getProgrammes(),
    getResources(),
    getAllEvents(),
    getAllNews(),
    getImpactStories(),
    getCourseSlugs(),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    "",
    "/about",
    "/programmes",
    "/resources",
    "/impact",
    "/news",
    "/academy",
    "/partner",
    "/contact",
    "/faq",
    "/privacy",
    "/terms",
  ].map((path) => ({ url: url(path), lastModified: new Date() }));

  return [
    ...staticPages,
    ...programmes
      .filter((item) => item.slug !== "beginner-academy")
      .map((item) => ({
        url: url(`/programmes/${item.slug}`),
        lastModified: item.updated_at,
      })),
    ...resources.map((item) => ({
      url: url(`/resources/${item.slug}`),
      lastModified: item.updated_at,
    })),
    ...events.map((item) => ({
      url: url(`/news/events/${item.slug}`),
      lastModified: item.updated_at,
    })),
    ...news.map((item) => ({
      url: url(`/news/${item.slug}`),
      lastModified: item.updated_at,
    })),
    ...stories.map((item) => ({
      url: url(`/impact/${item.slug}`),
    })),
    ...courses.map((slug) => ({ url: url(`/academy/${slug}`) })),
  ];
}
