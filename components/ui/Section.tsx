import { clsx } from "@/lib/cx";
import Container from "./Container";

export default function Section({
  id,
  soft = false,
  className,
  containerClassName,
  children,
}: {
  id?: string;
  soft?: boolean;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={clsx(
        "scroll-mt-24 py-10 sm:py-14 lg:py-20 xl:py-24",
        soft && "bg-bg-soft",
        className,
      )}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
