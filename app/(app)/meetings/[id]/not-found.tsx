import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-6 py-24">
      <h1 className="text-2xl font-semibold">Meeting not found</h1>
      <p className="mt-2 text-muted-foreground">
        This meeting doesn&apos;t exist or the link is out of date.
      </p>
      <Link href="/meetings" className="mt-6 inline-block font-medium text-primary underline underline-offset-4">
        Back to all meetings
      </Link>
    </div>
  );
}
