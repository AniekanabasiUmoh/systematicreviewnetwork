import {
  GraduationCap,
  Users,
  BookOpen,
  Presentation,
  Building2,
  Microscope,
  FileSearch,
  Globe2,
  Lightbulb,
  Target,
  type LucideIcon,
} from "lucide-react";

/* Sprint 5.7 — a programme's icon is stored as a NAME, because a database row
 * cannot hold a React component reference. This is the allowlist that turns
 * that name back into a component.
 *
 * programmeIcon() never throws and never returns undefined: an unrecognised
 * name (a typo, a row written before an icon was removed from this list, a
 * hand-edited database value) falls back to the default rather than crashing
 * the public programmes hub. Staff pick from a select — they never type a
 * component name — so the fallback is a safety net, not the normal path. */

export const PROGRAMME_ICONS = {
  GraduationCap,
  Users,
  BookOpen,
  Presentation,
  Building2,
  Microscope,
  FileSearch,
  Globe2,
  Lightbulb,
  Target,
} as const satisfies Record<string, LucideIcon>;

export type ProgrammeIconName = keyof typeof PROGRAMME_ICONS;

const DEFAULT_ICON: ProgrammeIconName = "GraduationCap";

/** Human labels for the admin select. */
export const PROGRAMME_ICON_OPTIONS: ReadonlyArray<{
  value: ProgrammeIconName;
  label: string;
}> = [
  { value: "GraduationCap", label: "Graduation cap — academy, course" },
  { value: "BookOpen", label: "Open book — reading, curriculum" },
  { value: "Users", label: "People — mentorship, cohort" },
  { value: "Presentation", label: "Presentation — webinar, talk" },
  { value: "Building2", label: "Building — institution, partnership" },
  { value: "Microscope", label: "Microscope — research, methods" },
  { value: "FileSearch", label: "Document search — review, appraisal" },
  { value: "Globe2", label: "Globe — international, reach" },
  { value: "Lightbulb", label: "Lightbulb — ideas, introduction" },
  { value: "Target", label: "Target — focus, outcomes" },
];

export function programmeIcon(name: string | null | undefined): LucideIcon {
  /* Object.hasOwn, not `in`: `in` walks the prototype chain, so the stored
     names "constructor", "toString" and "__proto__" would all resolve to
     built-ins and get handed to React as a component. */
  if (name && Object.hasOwn(PROGRAMME_ICONS, name)) {
    return PROGRAMME_ICONS[name as ProgrammeIconName];
  }
  return PROGRAMME_ICONS[DEFAULT_ICON];
}
