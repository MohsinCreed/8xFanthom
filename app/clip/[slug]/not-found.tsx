import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClipNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center sm:p-8">
        <h1 className="text-2xl font-semibold">This clip doesn&apos;t exist or was removed</h1>
        <p className="mt-2 text-muted-foreground">The link may be wrong, or the clip was deleted by its owner.</p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/meetings">Go to meetings</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
