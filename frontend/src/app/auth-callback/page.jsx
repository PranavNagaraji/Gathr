"use client";

import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import axios from "axios";

export default function AuthCallbackPage() {
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth(); // ✅ hook at top level
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const role = searchParams.get("role") || "customer";

    const assignRoleIfMissing = async () => {
      if (!isLoaded || !user) return;

      const token = await getToken();

      if (!user.publicMetadata?.role) {
        console.log("Setting role for user", user.id, "to", role);

        try {
          const res = await axios.post(
            "http://localhost:5000/set-role",
            {
              userId: user.id,
              role,
            },
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          console.log("Role updated:", res.data);
        } catch (err) {
          console.error("Error setting role:", err);
        }
      }

      router.push("/");
    };

    assignRoleIfMissing();
  }, [user, isLoaded, getToken, router, searchParams]);

  return <div className="text-center mt-20">Finalizing login...</div>;
}
