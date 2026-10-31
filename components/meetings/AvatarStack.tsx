import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface StackParticipant {
  name: string;
  color: string;
}

export interface AvatarStackProps {
  participants: StackParticipant[];
  /** Avatars shown before the "+N" pill. */
  max?: number;
  /** Diameter in px. */
  size?: number;
  className?: string;
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0].charAt(0);
  const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + last).toUpperCase();
}

export function AvatarStack({ participants, max = 5, size = 28, className }: AvatarStackProps) {
  if (participants.length === 0) return null;

  const shown = participants.slice(0, max);
  const hidden = participants.length - shown.length;
  const box = { width: size, height: size, minWidth: size };

  return (
    <div className={cn("flex items-center", className)}>
      <span className="sr-only">Participants: {participants.map((p) => p.name).join(", ")}</span>
      <div aria-hidden="true" className="flex -space-x-2">
        {shown.map((p, i) => (
          <Avatar key={`${p.name}-${i}`} className="ring-2 ring-background after:hidden" style={box}>
            <AvatarFallback
              className="font-medium text-white"
              style={{ backgroundColor: p.color, fontSize: Math.round(size * 0.38) }}
            >
              {initialsFor(p.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {hidden > 0 && (
          <span
            className="flex items-center justify-center rounded-full bg-muted px-1.5 text-xs font-medium text-muted-foreground ring-2 ring-background"
            style={{ height: size, minWidth: size }}
          >
            +{hidden}
          </span>
        )}
      </div>
    </div>
  );
}
