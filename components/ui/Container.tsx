import { clsx } from "@/lib/cx";

export default function Container({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={clsx("container-page", className)}>{children}</div>;
}
