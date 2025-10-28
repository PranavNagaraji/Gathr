"use client";

import { UserProfile } from "@clerk/nextjs";
import ProfileShell from "@/components/profile/ProfileShell";

export default function CarrierProfilePage() {
  return (
    <ProfileShell>
      <UserProfile
        appearance={{
          variables: {
            colorPrimary: "var(--primary)",
            colorText: "var(--foreground)",
            colorBackground: "var(--card)",
            colorInputBackground: "var(--background)",
            colorInputText: "var(--foreground)",
            colorDanger: "var(--destructive)",
          },
          elements: {
            rootBox: "w-full",
            card: "w-full max-w-none bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-none rounded-xl",
            navbar: "bg-[var(--card)] flex flex-wrap justify-between items-center",
            headerTitle: "text-[var(--foreground)] text-lg sm:text-xl font-semibold",
            profileSection: "bg-[var(--card)] w-full",
            formButtonPrimary:
              "bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90 transition-opacity duration-200",
            input: "bg-[var(--background)] text-[var(--foreground)] border border-[var(--border)] w-full",
          },
        }}
        routing="hash"
      />
    </ProfileShell>
  );
}

