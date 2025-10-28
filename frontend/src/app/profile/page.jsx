"use client";

import { UserProfile } from "@clerk/nextjs";

export default function ProfilePage() {
  return (
    <div className="min-h-screen w-full px-4 py-10 flex items-start justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-5xl">
        <UserProfile
          appearance={{
            variables: {
              colorPrimary: "var(--primary)",
              colorText: "var(--foreground)",
              colorBackground: "var(--card)",
              colorInputBackground: "var(--background)",
              colorInputText: "var(--foreground)",
              borderRadius: "var(--radius)",
              colorDanger: "var(--destructive)",
            },
            elements: {
              card: "bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-md",
              navbar: "bg-[var(--card)]",
              headerTitle: "text-[var(--foreground)]",
              profileSection: "bg-[var(--card)]",
              formButtonPrimary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90",
              input: "bg-[var(--background)] text-[var(--foreground)] border-[var(--border)]",
            },
          }}
          routing="hash"
        />
      </div>
    </div>
  );
}
