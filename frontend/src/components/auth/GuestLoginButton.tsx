"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import Button from "@/components/ui/Button";

interface GuestLoginButtonProps {
  className?: string;
  children?: React.ReactNode;
}

export default function GuestLoginButton({ className, children }: GuestLoginButtonProps) {
  const { user, loginAsGuest } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!user) {
      setLoading(true);
      try {
        await loginAsGuest();
      } finally {
        setLoading(false);
      }
      router.push("/consent");
      return;
    }
    // Returning user: skip consent if already given
    if (!user.hasConsented) { router.push("/consent"); return; }
    router.push(user.hasProfile ? "/plan" : "/screening");
  }

  return (
    <Button variant="outline" size="lg" onClick={handleClick} disabled={loading} className={className}>
      {loading ? "Loading..." : (children ?? "Continue as Guest")}
    </Button>
  );
}
