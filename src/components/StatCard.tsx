import styles from "./StatCard.module.css";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext?: string;
  variant?: "default" | "success" | "info" | "warning";
}

export default function StatCard({
  icon,
  label,
  value,
  subtext,
  variant = "default",
}: StatCardProps) {
  return (
    <div className={`${styles.card} ${styles[variant]}`}>
      <div className={styles.iconWrap}>{icon}</div>
      <div className={styles.info}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {subtext && <span className={styles.subtext}>{subtext}</span>}
      </div>
    </div>
  );
}
