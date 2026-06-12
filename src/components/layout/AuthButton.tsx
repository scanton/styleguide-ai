"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        {session.user.image && (
          <img
            src={session.user.image}
            alt={session.user.name ?? "User avatar"}
            width={32}
            height={32}
            className="rounded-full w-8 h-8 object-cover"
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut()}
          className="hidden sm:flex"
        >
          Sign out
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => signIn("google")}
      className="hidden sm:flex"
    >
      Sign in
    </Button>
  );
}
