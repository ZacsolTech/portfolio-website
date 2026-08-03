import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  onDark?: boolean;
  priority?: boolean;
  className?: string;
};

export function Logo({ onDark = false, priority = false, className }: LogoProps) {
  const classes = ["logo", onDark ? "logo--on-dark" : null, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Link href="/" className={classes} aria-label="ZACSOL Technologies">
      <Image
        className="logo__img logo__img--light"
        src="/brand/logo.png"
        alt="ZACSOL Technologies"
        width={168}
        height={118}
        priority={priority}
      />
      <Image
        className="logo__img logo__img--dark"
        src="/brand/logo-on-dark.png"
        alt=""
        width={168}
        height={118}
        priority={priority}
        aria-hidden
      />
    </Link>
  );
}
