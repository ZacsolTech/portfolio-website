import Image from "next/image";
import { publicImageSrc } from "@/lib/blog/media";

type Props = {
  src: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  className?: string;
};

export function ArticleImage({ src, alt, caption, priority, className }: Props) {
  return (
    <figure className={className ?? "article-figure"}>
      <Image
        src={publicImageSrc(src)}
        alt={alt}
        width={1600}
        height={900}
        sizes="(min-width: 1280px) 1120px, (min-width: 640px) 90vw, 100vw"
        priority={priority}
      />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
