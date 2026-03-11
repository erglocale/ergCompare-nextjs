"use client";

import { FormEvent, useState } from "react";
import styles from "./settings.module.css";

const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;

export default function ChangePasswordForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (currentPassword.length > MAX_PASSWORD_LENGTH) {
      setMessage({ type: "error", text: `Current password must be at most ${MAX_PASSWORD_LENGTH} characters.` });
      return;
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setMessage({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }

    if (newPassword.length > MAX_PASSWORD_LENGTH) {
      setMessage({ type: "error", text: `New password must be at most ${MAX_PASSWORD_LENGTH} characters.` });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to change password." });
        return;
      }

      setMessage({ type: "success", text: "Password changed successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => { setIsOpen(false); setMessage(null); }, 2000);
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.section}>
      <div className={styles.fieldRow}>
        <div className={styles.fieldInfo}>
          <h3 className={styles.fieldTitle}>Change Password</h3>
          <p className={styles.fieldDesc}>
            Update your account password. You&apos;ll need to enter your current password first.
          </p>
        </div>
        <div className={styles.fieldControl}>
          {!isOpen ? (
            <button
              type="button"
              className={styles.changePasswordBtn}
              onClick={() => setIsOpen(true)}
            >
              Change Password
            </button>
          ) : (
          <form onSubmit={handleSubmit} className={styles.passwordForm}>
            {message && (
              <p className={message.type === "success" ? styles.successMsg : styles.errorMsg}>
                {message.text}
              </p>
            )}
            <div className={styles.passwordField}>
              <input
                className={styles.input}
                type={showCurrent ? "text" : "password"}
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value.slice(0, MAX_PASSWORD_LENGTH))}
                required
                autoComplete="current-password"
                maxLength={MAX_PASSWORD_LENGTH}
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowCurrent((v) => !v)}
                tabIndex={-1}
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
            <div className={styles.passwordField}>
              <input
                className={styles.input}
                type={showNew ? "text" : "password"}
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value.slice(0, MAX_PASSWORD_LENGTH))}
                required
                minLength={MIN_PASSWORD_LENGTH}
                maxLength={MAX_PASSWORD_LENGTH}
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowNew((v) => !v)}
                tabIndex={-1}
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
            <input
              className={styles.input}
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value.slice(0, MAX_PASSWORD_LENGTH))}
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={MAX_PASSWORD_LENGTH}
              autoComplete="new-password"
            />
            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.changePasswordBtn}
                disabled={loading || !currentPassword || !newPassword || !confirmPassword}
              >
                {loading ? "Changing\u2026" : "Save Password"}
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => { setIsOpen(false); setMessage(null); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); }}
              >
                Cancel
              </button>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
