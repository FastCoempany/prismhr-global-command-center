"use client";

// Smart paste — the clipboard from Word / OneNote / Teams / a web page carries
// a rich HTML flavor alongside the plain text, and plain-text boxes normally
// throw the structure away. This converts that HTML flavor into clean text:
// list items become "- " (or "1. ") lines with nesting indents, paragraphs
// keep their line breaks, everything else is stripped.

import type { ClipboardEvent } from "react";

function walk(node: Node, depth: number, out: string[], olIndex: number | null) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Collapse the whitespace runs HTML sources are full of.
    const t = (node.textContent ?? "").replace(/\s+/g, " ");
    if (t) out.push(t);
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (tag === "style" || tag === "script" || tag === "head" || tag === "title") return;

  if (tag === "br") {
    out.push("\n");
    return;
  }

  if (tag === "li") {
    const parentTag = el.parentElement?.tagName.toLowerCase();
    const marker = parentTag === "ol" && olIndex != null ? `${olIndex}. ` : "- ";
    out.push(`\n${"  ".repeat(Math.max(0, depth))}${marker}`);
    for (const child of Array.from(el.childNodes)) {
      const childTag =
        child.nodeType === Node.ELEMENT_NODE
          ? (child as Element).tagName.toLowerCase()
          : "";
      if (childTag === "ul" || childTag === "ol") {
        walk(child, depth + 1, out, null);
      } else {
        walk(child, depth, out, null);
      }
    }
    return;
  }

  if (tag === "ul" || tag === "ol") {
    let i = 0;
    for (const child of Array.from(el.childNodes)) {
      const isLi =
        child.nodeType === Node.ELEMENT_NODE &&
        (child as Element).tagName.toLowerCase() === "li";
      walk(child, depth, out, tag === "ol" && isLi ? ++i : null);
    }
    out.push("\n");
    return;
  }

  const blocky =
    tag === "p" ||
    tag === "div" ||
    tag === "tr" ||
    tag === "table" ||
    tag === "blockquote" ||
    /^h[1-6]$/.test(tag);
  if (blocky) out.push("\n");
  if (tag === "td" || tag === "th") out.push(" ");

  for (const child of Array.from(el.childNodes)) walk(child, depth, out, null);
  if (blocky) out.push("\n");
}

export function htmlToPlainText(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const out: string[] = [];
  walk(doc.body, 0, out, null);
  return out
    .join("")
    .replace(/[ \t]+\n/g, "\n") // no trailing spaces on lines
    .replace(/\n[ \t]+(?![-\d])/g, "\n") // no stray indent except list markers
    .replace(/\n{3,}/g, "\n\n") // at most one blank line
    .trim();
}

// Drop-in onPaste handler for controlled textareas. Returns without touching
// the event when there's no HTML flavor (default paste is already right).
export function smartPaste(
  e: ClipboardEvent<HTMLTextAreaElement>,
  value: string,
  set: (next: string) => void,
) {
  const html = e.clipboardData?.getData("text/html");
  if (!html) return;
  const text = htmlToPlainText(html);
  if (!text) return;
  // If the conversion adds nothing over the plain flavor (no lists, no
  // structure), let the browser do its normal thing.
  const plain = e.clipboardData.getData("text/plain") ?? "";
  if (!/^[-\d]/m.test(text) && text === plain.trim()) return;
  e.preventDefault();
  const el = e.currentTarget;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? value.length;
  set(value.slice(0, start) + text + value.slice(end));
  const caret = start + text.length;
  requestAnimationFrame(() => {
    try {
      el.setSelectionRange(caret, caret);
    } catch {
      // element unmounted or not focusable — caret position is cosmetic
    }
  });
}
