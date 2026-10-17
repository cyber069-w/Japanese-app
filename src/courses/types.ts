/**
 * A course groups study modules into the same five areas for every subject:
 * Study · Practice & Review · Exam Preparation · Imports · Tutor.
 *
 * Each course is one folder with a course.json (see README → "Add a course").
 * Courses only arrange existing modules – saved progress is keyed by module id
 * and never changes when a module moves between sections or courses.
 */

/** A module shown in a section. A plain string is the module id. */
export type CourseEntry =
  | string
  | {
      id: string;
      /** Shown as "coming later"; progress stays saved but nothing is due. */
      soon?: boolean;
      /** Content not taken from your own material yet: true = whole module, or exercise ids. */
      unverified?: boolean | string[];
    };

/** Something planned that has no content yet (e.g. mock exams). */
export interface Placeholder {
  name: string;
  description: string;
  icon?: string;
}

export interface CourseSection {
  title: string;
  /** Short line under the title. */
  note?: string;
  modules?: CourseEntry[];
  placeholders?: Placeholder[];
}

/** A curriculum topic with numbered learning modules that are filled over time (CFA). */
export interface Topic {
  id: string;
  name: string;
  /** Number of learning modules in the curriculum. */
  modules: number;
  /** Exam weight range in percent, e.g. [11, 14]. */
  weight: [number, number];
}

/** One part of the preparation meter. */
export interface MeterSection {
  label: string;
  /** Relative weight (normalised over all sections). */
  weight: number;
  modules: string[];
}

export interface CourseConfig {
  id: string;
  name: string;
  /** Subtitle, e.g. the name in the course's language. */
  subtitle?: string;
  /** One character for the course seal. */
  glyph: string;
  order: number;
  description: string;
  /** Link to this course's Claude Project (https://claude.ai/project/…). Fill in yourself. */
  claudeProjectUrl: string;
  study: CourseSection[];
  exam: CourseSection[];
  /** Curriculum topics (shown under Study, one meter section each). */
  topics?: Topic[];
  /** Preparation meter sections. Courses with topics use the topics instead. */
  meter?: MeterSection[];
}
