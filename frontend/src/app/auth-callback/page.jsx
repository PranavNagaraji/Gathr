//This is an intermediate route used to set the roles after succesfull signup
"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import axios from "axios";

export default function AuthCallbackPage() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const role = searchParams.get("role") || "customer";

    const assignRoleIfMissing = async () => {
      if (isLoaded && user) {
        // Only update if role not set
        if (!user.publicMetadata?.role) {
          const res = await axios.post("http://localhost:5000/set-role", {
            userId: user.id,
            role,
          },{
            headers: {
              "Content-Type": "application/json",
            },
          })
          console.log(res);
        }
        router.push("/");
      }
    };

    assignRoleIfMissing();
  }, [user, isLoaded]);

  return <div className="text-center mt-20">Finalizing login...</div>;
}
