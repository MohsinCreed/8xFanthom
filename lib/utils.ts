export { cn } from "cn"

/** True when the event target is a text-entry control (keyboard shortcuts must not fire). */
export function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  const tag = t.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t.isContentEditable
}

const INTERACTIVE_SELECTOR =
  'button, a[href], summary, [role="tab"], [role="slider"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="option"], [role="combobox"]'

/** True when the target is typing-capable or a control that handles Space/Enter natively. */
export function isInteractiveTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false
  return isTypingTarget(t) || t.closest(INTERACTIVE_SELECTOR) !== null
}
