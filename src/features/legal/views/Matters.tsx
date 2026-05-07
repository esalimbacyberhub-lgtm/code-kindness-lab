import type { Matter } from "../types";
import { Briefcase } from "lucide-react";

const TYPE_TONE: Record<Matter["type"], string> = {
  "Civil Litigation": "bg-accent/15 text-accent",
  "Commercial": "bg-primary/15 text-primary",
  "Family Law": "bg-warning/15 text-warning",
  "Criminal": "bg-destructive/15 text-destructive",
  "Conveyancing": "bg-success/15 text-success",
  "Intellectual Property": "bg-primary/15 text-primary",
  "Probate & Administration": "bg-muted text-foreground",
};

export const MatterHub = Matters;

export function Matters({ matters }: { matters: Matter[] }) {
  return (
    <div>
      <h2 className="text-3xl font-serif mb-6">Matter Hub</h2>
      {matters.length === 0 && (
        <div className="glass-card rounded-2xl p-10 text-center text-sm text-muted-foreground">
          No matters yet. Open a new matter from the Command Deck.
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {matters.map(m => (
          <article key={m.id} className="glass-card glass-card-hover rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-serif text-lg leading-tight truncate">{m.title}</h3>
                <p className="text-xs text-muted-foreground">{m.client}</p>
              {(m.partyA || m.partyB) && <p className="text-xs text-amber-400/80 font-medium mt-0.5">{m.partyA}{m.partyA && m.partyB ? " v. " : ""}{m.partyB}</p>}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${TYPE_TONE[m.type]}`}>{m.type}</span>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{m.status}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
