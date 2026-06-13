import type { Metadata } from "next";
import { ProfileClient } from "@/components/account/ProfileClient";

export const metadata: Metadata = {
  title: "Profile | StyleGuideAI",
  description: "Manage your StyleGuideAI profile.",
};

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-10 pb-16">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
          <p className="mt-1 text-muted-foreground text-sm">Manage your account details.</p>
        </div>
        <ProfileClient />
      </div>
    </main>
  );
}
