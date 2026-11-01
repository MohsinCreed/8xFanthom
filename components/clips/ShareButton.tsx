"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function fallbackCopy(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

export function ShareButton({ slug, className, label = "Copy link" }: { slug: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const onClick = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const base = (siteUrl ? siteUrl : window.location.origin).replace(/\/+$/, "");
    const url = `${base}/clip/${slug}`;

    let ok = false;
    try {
      if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
      await navigator.clipboard.writeText(url);
      ok = true;
    } catch {
      ok = fallbackCopy(url);
    }
    if (!ok) return;

    clearTimeout(timer.current);
    setCopied(true);
    timer.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className={cn(className)}>
      {copied ? <Check className="text-success-text" aria-hidden /> : <Link2 aria-hidden />}
      <span aria-live="polite" className={cn(copied && "text-success-text")}>
        {copied ? "Copied" : label}
      </span>
    </Button>
  );
}
