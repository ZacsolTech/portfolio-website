import { brandShareImage, size, alt, contentType } from "@/lib/og-image";

export const runtime = "edge";
export { alt, size, contentType };

export default function TwitterImage() {
  return brandShareImage();
}
