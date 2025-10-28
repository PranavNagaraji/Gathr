"use client";

import { useUser } from "@clerk/nextjs";

export default function ProfileShell({ title = "Profile", appearance = {}, children, childrenAfterClerk = true }) {
  const { user } = useUser();
  const role = user?.publicMetadata?.role || "user";
  const name = user?.fullName || user?.username || user?.primaryEmailAddress?.emailAddress || "User";
  const avatar = user?.imageUrl;

  return (
    <div className="min-h-screen w-full px-4 py-10 flex items-start justify-center bg-[var(--background)] text-[var(--foreground)]">
      <div className="w-full max-w-5xl">
        <div className="mb-6 flex items-center gap-4 p-5 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
          {avatar && <img src={avatar} alt="Avatar" className="w-16 h-16 rounded-full object-cover border" />}
          <div className="flex flex-col">
            <div className="text-2xl font-extrabold tracking-tight">{name}</div>
            <div className="mt-1 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-white bg-gray-500 px-2 py-1 rounded-md w-max">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              {String(role)}
            </div>
          </div>
        </div>

        {children && !childrenAfterClerk ? children : null}

        {/* The caller should render Clerk's UserProfile within children or page if needed */}
        {children && childrenAfterClerk ? children : null}
      </div>
    </div>
  );
}
