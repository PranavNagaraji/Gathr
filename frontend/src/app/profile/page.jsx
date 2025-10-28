"use client";

import { UserProfile } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";

export default function ProfilePage() {
  const { user } = useUser();
  const role = user?.publicMetadata?.role || "user";
  const name = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "User";
  const avatar = user?.imageUrl;
  return (
    <div className="min-h-screen w-full px-4 py-10 flex items-start justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex items-center gap-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {avatar && (
            <img src={avatar} alt="Avatar" className="w-14 h-14 rounded-full object-cover border" />
          )}
          <div>
            <div className="text-xl font-semibold">{name}</div>
            <div className="text-sm text-[var(--muted-foreground)] capitalize">Role: {String(role)}</div>
          </div>
        </div>
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
              rootBox: "w-full",
              card: "w-full max-w-none bg-[var(--card)] text-[var(--card-foreground)] border border-[var(--border)] shadow-md",
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

