"use client";

import Link from "next/link";
import { useEffect } from "react";

// Replaces the root layout when it fails, so it cannot rely on fonts, Tailwind or shadcn.
// Styling is inline and uses the same palette as globals.css.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 16px",
          boxSizing: "border-box",
          background: "#FAF9F6",
          color: "#1C1B1A",
          fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 448,
            border: "1px solid #E8E5DE",
            borderRadius: 8,
            background: "#FFFFFF",
            padding: 32,
            textAlign: "center",
            boxSizing: "border-box",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.3 }}>Something went wrong</h1>
          <p style={{ margin: "8px 0 0", color: "#6B675F", lineHeight: 1.5 }}>
            We couldn&apos;t load this page. Check your connection and try again.
          </p>
          <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: "1px solid transparent",
                borderRadius: 6,
                background: "#4338CA",
                color: "#FFFFFF",
                padding: "8px 14px",
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Try again
            </button>
            <Link
              href="/meetings"
              style={{
                border: "1px solid #E8E5DE",
                borderRadius: 6,
                background: "#FFFFFF",
                color: "#1C1B1A",
                padding: "8px 14px",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
              }}
            >
              Back to meetings
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
