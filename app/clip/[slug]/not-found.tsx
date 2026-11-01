import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ClipNotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">This clip doesn&apos;t exist or was removed</h1>
      <p className="text-muted-foreground">The link may be wrong, or the clip was deleted by its owner.</p>
      <Button asChild>
        <Link href="/meetings">Go to meetings</Link>
      </Button>
    </main>
  );
}
