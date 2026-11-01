import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function MeetingNotFound() {
  return (
    <div className="flex items-center justify-center px-5 py-16 lg:px-10">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center sm:p-8">
        <h1 className="text-2xl font-semibold">Meeting not found</h1>
        <p className="mt-2 text-muted-foreground">This meeting doesn&apos;t exist or the link is out of date.</p>
        <div className="mt-6 flex justify-center">
          <Button asChild>
            <Link href="/meetings">Go to meetings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
