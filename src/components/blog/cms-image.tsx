import { publicImageSrc } from "@/lib/blog/media";

type FillProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fill: true;
  sizes?: string;
  width?: never;
  height?: never;
};

type SizedProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  fill?: false;
  sizes?: string;
  width: number;
  height: number;
};

/** CMS / Blob photos — native img so Vercel does not need next/image host rules. */
export function CmsImage(props: FillProps | SizedProps) {
  const src = publicImageSrc(props.src);
  const { alt, className, priority } = props;

  if (props.fill) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={props.width}
      height={props.height}
      className={className}
      decoding="async"
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
