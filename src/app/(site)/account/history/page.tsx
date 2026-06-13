import type { Metadata } from "next";
import { HistoryClient } from "@/components/account/HistoryClient";

export const metadata: Metadata = {
  title: "My History",
  description: "Your saved StyleDice rolls and StyleBear prompts.",
};

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">My History</h1>
          <p className="mt-1 text-muted-foreground text-sm">Your saved prompts and dice rolls.</p>
        </div>
        <HistoryClient />
      </div>
    </main>
  );
}
