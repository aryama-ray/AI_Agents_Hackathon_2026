"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { exportUserData, deleteUserData } from "@/lib/api";

export default function SettingsPage() {
  const { user, logout } = useUser();
  const router = useRouter();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) {
    router.replace("/");
    return null;
  }

  async function handleExport() {
    if (!user) return;
    setIsExporting(true);
    setMessage(null);
    try {
      const data = await exportUserData(user.id);
      // Trigger download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attune-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setMessage("Data exported successfully.");
    } catch {
      setMessage("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    setIsDeleting(true);
    setMessage(null);
    try {
      await deleteUserData(user.id);
      logout();
      router.replace("/");
    } catch {
      setMessage("Failed to delete data. Please try again.");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-6 font-serif text-3xl font-bold text-foreground">
        Settings
      </h1>

      {/* Account Info */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Account</h2>
        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Name:</span>{" "}
            {user.name}
          </p>
          {user.email && (
            <p>
              <span className="font-medium text-foreground">Email:</span>{" "}
              {user.email}
            </p>
          )}
          <p>
            <span className="font-medium text-foreground">Account type:</span>{" "}
            {user.isGuest ? "Guest" : "Registered"}
          </p>
        </div>
      </Card>

      {/* Data Privacy */}
      <Card className="mb-6">
        <h2 className="text-lg font-semibold text-foreground">Your Data</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Attune stores your screening results, daily plans, and intervention
          history. All data is encrypted at rest and only accessible to you.
        </p>

        <div className="mt-4 flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            isLoading={isExporting}
          >
            Export My Data
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
          >
            Delete All My Data
          </Button>
        </div>

        {message && (
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        )}
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Card padding="lg" className="mx-4 max-w-md">
            <h3 className="text-lg font-semibold text-error">
              Delete All Data?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This will permanently delete your screening results, plans,
              interventions, and account. This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleDelete}
                isLoading={isDeleting}
              >
                Yes, Delete Everything
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
