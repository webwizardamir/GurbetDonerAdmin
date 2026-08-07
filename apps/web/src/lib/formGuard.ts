/**
 * Spam guard shared by the three public forms (contact, samples, distributor brief).
 *
 * Layered, cheapest check first:
 *   1. honeypot   two decoy fields that no human can see, tab into, or autofill
 *   2. time trap  a form "filled in" in under a few seconds was not typed by a person
 *   3. content    link floods and BBCode are what the remaining bots actually post
 *   4. rate limit one browser blasting the same form over and over
 *
 * A rejected submit is deliberately indistinguishable from an accepted one: the
 * visitor sees the same thank-you panel and no error. A bot that gets told why it
 * failed simply retunes and comes back.
 *
 * Keep this client-side layer even after the forms are wired to a real mail
 * endpoint. It is the cheap filter; the endpoint still has to validate for itself,
 * because anything here can be skipped by posting straight to the URL.
 */

/** Decoy inputs. Named so browser and password-manager autofill leaves them alone. */
export const HONEYPOT_FIELDS = ["website", "fax_number"] as const;

/** Hidden field stamped with the page-load time by `armFormGuard`. */
export const TIMESTAMP_FIELD = "_rendered_at";

/** Below this, nobody typed a name, an email and a message. */
const MIN_FILL_MS = 3500;

/** Above this the page has been sitting around long enough to be a replayed capture. */
const MAX_FILL_MS = 6 * 60 * 60 * 1000;

/** A trade enquiry does not need three links in it. */
const MAX_LINKS = 2;

const MAX_SUBMITS_PER_WINDOW = 3;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_KEY = "melek:form-submits";

const LINK_PATTERN = /(https?:\/\/|www\.)\S+/gi;
const MARKUP_PATTERN = /\[url[=\]]|\[\/url\]|<a\s+href|\[link[=\]]/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

export type SpamReason =
  | "honeypot"
  | "too-fast"
  | "stale"
  | "links"
  | "markup"
  | "email"
  | "rate";

export interface SpamVerdict {
  spam: boolean;
  reason: SpamReason | null;
}

const CLEAN: SpamVerdict = { spam: false, reason: null };

/**
 * Stamp the load time into the form. Called on mount, so a client with no JS
 * leaves the field empty and `inspectSubmission` treats the post as suspect.
 */
export function armFormGuard(form: HTMLFormElement): void {
  const field = form.elements.namedItem(TIMESTAMP_FIELD);
  if (field instanceof HTMLInputElement) field.value = String(Date.now());
}

function value(form: HTMLFormElement, name: string): string {
  const field = form.elements.namedItem(name);
  if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
    return field.value.trim();
  }
  return "";
}

/** Every free-text value on the form, which is where link spam lands. */
function freeText(form: HTMLFormElement): string {
  const parts: string[] = [];
  for (const el of Array.from(form.elements)) {
    if (el instanceof HTMLTextAreaElement) parts.push(el.value);
    else if (el instanceof HTMLInputElement && (el.type === "text" || el.type === "email")) {
      parts.push(el.value);
    }
  }
  return parts.join("\n");
}

/**
 * Sliding window kept in localStorage so it survives a tab reopen. Trivially
 * bypassed by a real attacker, which is fine: it is aimed at the dumb loop that
 * submits the same payload forty times.
 */
function rateLimited(): boolean {
  let stamps: number[] = [];
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (raw) stamps = (JSON.parse(raw) as number[]).filter((n) => typeof n === "number");
  } catch {
    stamps = [];
  }

  const cutoff = Date.now() - RATE_WINDOW_MS;
  stamps = stamps.filter((t) => t > cutoff);
  if (stamps.length >= MAX_SUBMITS_PER_WINDOW) return true;

  stamps.push(Date.now());
  try {
    localStorage.setItem(RATE_KEY, JSON.stringify(stamps));
  } catch {
    /* private mode, no storage: fall through and allow the submit */
  }
  return false;
}

export function inspectSubmission(form: HTMLFormElement): SpamVerdict {
  for (const name of HONEYPOT_FIELDS) {
    if (value(form, name) !== "") return { spam: true, reason: "honeypot" };
  }

  const stamp = Number(value(form, TIMESTAMP_FIELD));
  if (!Number.isFinite(stamp) || stamp <= 0) return { spam: true, reason: "too-fast" };
  const elapsed = Date.now() - stamp;
  if (elapsed < MIN_FILL_MS) return { spam: true, reason: "too-fast" };
  if (elapsed > MAX_FILL_MS) return { spam: true, reason: "stale" };

  const text = freeText(form);
  if (MARKUP_PATTERN.test(text)) return { spam: true, reason: "markup" };
  if ((text.match(LINK_PATTERN) ?? []).length > MAX_LINKS) return { spam: true, reason: "links" };

  const email = value(form, "email");
  if (email && !EMAIL_PATTERN.test(email)) return { spam: true, reason: "email" };

  if (rateLimited()) return { spam: true, reason: "rate" };

  return CLEAN;
}

function successPanel(message: string): HTMLElement {
  const panel = document.createElement("div");
  panel.setAttribute("role", "status");
  panel.style.padding = "1rem 1.25rem";
  panel.style.border = "1px solid var(--color-emerald)";
  panel.style.borderRadius = "var(--radius)";
  panel.style.background = "color-mix(in srgb, var(--color-emerald) 8%, #fff)";
  panel.style.color = "var(--color-emerald)";
  panel.style.fontSize = "0.9375rem";
  panel.textContent = message;
  return panel;
}

export interface MountOptions {
  /** CSS selector for the form. */
  selector: string;
  /** Label used in the console line for a clean submit. */
  label: string;
  /** Thank-you copy shown in place of the form, spam or not. */
  successMessage: string;
}

/**
 * Wire a public form: arm the time trap, screen the submit, and swap the form
 * for the thank-you panel either way.
 */
export function mountPublicForm({ selector, label, successMessage }: MountOptions): void {
  const form = document.querySelector<HTMLFormElement>(selector);
  if (!form) return;

  armFormGuard(form);

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const verdict = inspectSubmission(form);
    if (!verdict.spam) {
      // Resend wiring intentionally deferred: log + thank-you UX per current brief.
      const data = Object.fromEntries(new FormData(form));
      for (const name of HONEYPOT_FIELDS) delete data[name];
      delete data[TIMESTAMP_FIELD];
      console.info(`[Melek] ${label} submitted:`, data);
    }

    form.replaceWith(successPanel(successMessage));
  });
}
