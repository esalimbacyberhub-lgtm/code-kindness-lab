import { Hammer } from "lucide-react";
export function Placeholder({ name }: { name: string }) {
  return (
    <div className="text-center py-24">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
        <Hammer className="w-7 h-7 text-primary" />
      </div>
      <h2 className="text-2xl font-serif mb-2">{name}</h2>
      <p className="text-muted-foreground">This module is coming soon.</p>
    </div>
  );
}
