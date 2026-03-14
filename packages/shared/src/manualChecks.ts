import { ManualCheckResult } from './types';

export type CheckCategory =
  | 'Keyboard & Focus'
  | 'Forms & Input'
  | 'Images & Media'
  | 'Color & Visual'
  | 'Links & Navigation'
  | 'Content & Structure'
  | 'Video & Audio';

export type CheckPriority = 'high' | 'medium' | 'low';

export interface PredefinedCheck {
  id: string;
  criterion: string;
  level: 'A' | 'AA' | 'AAA';
  title: string;
  description: string;
  category: CheckCategory;
  priority: CheckPriority;
}

export const PREDEFINED_CHECKS: PredefinedCheck[] = [
  // ── Level A ──────────────────────────────────────────────────────────────
  {
    id: '1.1.1', criterion: '1.1.1', level: 'A',
    title: 'Non-text Content',
    description: 'All non-text content has a text alternative that serves the equivalent purpose.',
    category: 'Images & Media',
    priority: 'high',
  },
  {
    id: '1.2.1', criterion: '1.2.1', level: 'A',
    title: 'Audio-only and Video-only (Prerecorded)',
    description: 'Prerecorded audio-only and video-only content has an equivalent alternative.',
    category: 'Video & Audio',
    priority: 'low',
  },
  {
    id: '1.2.2', criterion: '1.2.2', level: 'A',
    title: 'Captions (Prerecorded)',
    description: 'Captions are provided for all prerecorded audio content in synchronized media.',
    category: 'Video & Audio',
    priority: 'medium',
  },
  {
    id: '1.3.3', criterion: '1.3.3', level: 'A',
    title: 'Sensory Characteristics',
    description: 'Instructions do not rely solely on sensory characteristics such as shape, color, size, visual location, or sound.',
    category: 'Content & Structure',
    priority: 'medium',
  },
  {
    id: '1.4.1', criterion: '1.4.1', level: 'A',
    title: 'Use of Color',
    description: 'Color is not used as the only visual means of conveying information, indicating an action, or distinguishing an element.',
    category: 'Color & Visual',
    priority: 'high',
  },
  {
    id: '2.1.1', criterion: '2.1.1', level: 'A',
    title: 'Keyboard',
    description: 'All functionality is operable through a keyboard interface without requiring specific timings for individual keystrokes.',
    category: 'Keyboard & Focus',
    priority: 'high',
  },
  {
    id: '2.1.2', criterion: '2.1.2', level: 'A',
    title: 'No Keyboard Trap',
    description: 'If keyboard focus can be moved to a component, focus can be moved away using only the keyboard.',
    category: 'Keyboard & Focus',
    priority: 'high',
  },
  {
    id: '2.4.3', criterion: '2.4.3', level: 'A',
    title: 'Focus Order',
    description: 'If a web page can be navigated sequentially, focusable components receive focus in an order that preserves meaning and operability.',
    category: 'Keyboard & Focus',
    priority: 'high',
  },
  {
    id: '2.4.4', criterion: '2.4.4', level: 'A',
    title: 'Link Purpose (In Context)',
    description: 'The purpose of each link can be determined from the link text alone or from the link and its context.',
    category: 'Links & Navigation',
    priority: 'high',
  },
  {
    id: '3.2.1', criterion: '3.2.1', level: 'A',
    title: 'On Focus',
    description: 'If any component receives focus, it does not automatically change the context.',
    category: 'Keyboard & Focus',
    priority: 'medium',
  },
  {
    id: '3.2.2', criterion: '3.2.2', level: 'A',
    title: 'On Input',
    description: 'Changing a setting of a user interface component does not automatically cause a change of context.',
    category: 'Forms & Input',
    priority: 'medium',
  },
  {
    id: '3.3.1', criterion: '3.3.1', level: 'A',
    title: 'Error Identification',
    description: 'If an input error is detected, the item in error is identified and the error is described to the user in text.',
    category: 'Forms & Input',
    priority: 'high',
  },
  {
    id: '3.3.2', criterion: '3.3.2', level: 'A',
    title: 'Labels or Instructions',
    description: 'Labels or instructions are provided when content requires user input.',
    category: 'Forms & Input',
    priority: 'high',
  },
  // ── Level AA ─────────────────────────────────────────────────────────────
  {
    id: '1.2.4', criterion: '1.2.4', level: 'AA',
    title: 'Captions (Live)',
    description: 'Captions are provided for all live audio content in synchronized media.',
    category: 'Video & Audio',
    priority: 'low',
  },
  {
    id: '1.2.5', criterion: '1.2.5', level: 'AA',
    title: 'Audio Description (Prerecorded)',
    description: 'Audio description is provided for all prerecorded video content in synchronized media.',
    category: 'Video & Audio',
    priority: 'low',
  },
  {
    id: '1.4.4', criterion: '1.4.4', level: 'AA',
    title: 'Resize Text',
    description: 'Text can be resized without assistive technology up to 200% without loss of content or functionality.',
    category: 'Color & Visual',
    priority: 'medium',
  },
  {
    id: '1.4.10', criterion: '1.4.10', level: 'AA',
    title: 'Reflow',
    description: 'Content can be presented without loss of information at 320px width without requiring two-dimensional scrolling.',
    category: 'Color & Visual',
    priority: 'high',
  },
  {
    id: '1.4.11', criterion: '1.4.11', level: 'AA',
    title: 'Non-text Contrast',
    description: 'The visual presentation of UI components and graphical objects has at least a 3:1 contrast ratio against adjacent color(s).',
    category: 'Color & Visual',
    priority: 'high',
  },
  {
    id: '1.4.12', criterion: '1.4.12', level: 'AA',
    title: 'Text Spacing',
    description: 'No loss of content or functionality occurs when text spacing is changed (line height, letter spacing, word spacing, paragraph spacing).',
    category: 'Color & Visual',
    priority: 'medium',
  },
  {
    id: '2.4.7', criterion: '2.4.7', level: 'AA',
    title: 'Focus Visible',
    description: 'Any keyboard operable user interface has a mode of operation where the keyboard focus indicator is visible.',
    category: 'Keyboard & Focus',
    priority: 'high',
  },
  {
    id: '3.2.3', criterion: '3.2.3', level: 'AA',
    title: 'Consistent Navigation',
    description: 'Navigational mechanisms that are repeated on multiple pages occur in the same relative order each time they are repeated.',
    category: 'Links & Navigation',
    priority: 'medium',
  },
  {
    id: '3.2.4', criterion: '3.2.4', level: 'AA',
    title: 'Consistent Identification',
    description: 'Components that have the same functionality across pages are identified consistently.',
    category: 'Links & Navigation',
    priority: 'medium',
  },
  {
    id: '3.3.3', criterion: '3.3.3', level: 'AA',
    title: 'Error Suggestion',
    description: 'If an input error is detected and suggestions for correction are known, the suggestion is provided to the user in text.',
    category: 'Forms & Input',
    priority: 'medium',
  },
  {
    id: '3.3.4', criterion: '3.3.4', level: 'AA',
    title: 'Error Prevention (Legal, Financial, Data)',
    description: 'For pages that cause legal commitments or financial transactions, submissions can be reversed, checked, or confirmed.',
    category: 'Forms & Input',
    priority: 'medium',
  },
];

/** Display order for the By Category view */
export const CATEGORY_ORDER: CheckCategory[] = [
  'Keyboard & Focus',
  'Images & Media',
  'Color & Visual',
  'Forms & Input',
  'Links & Navigation',
  'Content & Structure',
  'Video & Audio',
];

/** One-line testing hint shown under each category heading */
export const CATEGORY_DESCRIPTIONS: Record<CheckCategory, string> = {
  'Keyboard & Focus':    'Tab through the page without a mouse — verify all controls are reachable and focus is always visible.',
  'Images & Media':      'Inspect all images, icons, and graphics for meaningful, accurate text alternatives.',
  'Color & Visual':      'Test with zoomed text, high contrast, and custom text spacing; check UI component contrast ratios.',
  'Forms & Input':       'Submit forms with intentional errors; verify every input has a visible label and helpful error messages.',
  'Links & Navigation':  'Read link text in isolation — does each one describe its destination without surrounding context?',
  'Content & Structure': 'Look for instructions that rely on position, shape, color, or sound to convey meaning.',
  'Video & Audio':       'Check for captions, transcripts, or audio descriptions on any media present on this page.',
};

export function createDefaultChecks(): ManualCheckResult[] {
  const now = new Date().toISOString();
  return PREDEFINED_CHECKS.map(c => ({
    id: c.id,
    type: 'wcag' as const,
    wcagCriterion: c.criterion,
    level: c.level,
    title: c.title,
    description: c.description,
    status: 'not-tested' as const,
    updatedAt: now,
  }));
}
