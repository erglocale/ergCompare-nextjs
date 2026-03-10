import { requireSession } from "@/lib/auth";
import styles from "./settings.module.css";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function SettingsPage() {
  const session = await requireSession();
  const name = session.user.name || "Unnamed User";
  const email = session.user.email;
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "JD";

  const accountCreatedDate = new Date().toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <div className={styles.page}>
      <div className={styles.settingsCard}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.avatar}>
            {initials}
          </div>
          <div className={styles.headerInfo}>
            <h1 className={styles.title}>My Account</h1>

          </div>
          <a className="btn btn-outline" href="/api/auth/logout">Log out</a>
        </div>

        <div className={styles.divider} />

        {/* Profile Form */}
        <div className={styles.section}>
          <div className={styles.fieldRow}>
            <div className={styles.fieldInfo}>
              <h3 className={styles.fieldTitle}>Name</h3>

            </div>
            <div className={styles.fieldControl}>
              <input className={styles.input} value={name} disabled />
            </div>
          </div>

          <div className={styles.divider} />

          <div className={styles.fieldRow}>
            <div className={styles.fieldInfo}>
              <h3 className={styles.fieldTitle}>Email Address</h3>

            </div>
            <div className={styles.fieldControl}>
              <input className={styles.input} value={email} disabled />
            </div>
          </div>
        </div>

        <div className={styles.divider} />

        {/* Change Password */}
        <ChangePasswordForm />

        <div className={styles.divider} />

        {/* Account Metadata */}
        <div className={styles.section}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Account Created</span>
            <span className={styles.metaValue}>{accountCreatedDate}</span>
          </div>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Status</span>
            <span className={styles.metaValue}>{session.user.status}</span>
          </div>
        </div>

        <div className={styles.divider} />
      </div>
    </div>
  );
}
