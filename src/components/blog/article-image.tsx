import { CmsImage } from "@/components/blog/cms-image";

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
      <CmsImage src={src} alt={alt} width={1600} height={900} priority={priority} />
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
