import Sidebar from "@/components/Sidebar";
import { requireSession } from "@/lib/auth";
import styles from "./dashboard.module.css";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className={styles.dashboardWrapper}>
      <Sidebar user={session.user} />
      <main className={styles.main}>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}

