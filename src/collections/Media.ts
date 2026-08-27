import path from "path";
import { fileURLToPath } from "url";
import type { CollectionConfig } from "payload";
import { isLoggedIn } from "@/lib/access";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Image", plural: "Media" },
  admin: {
    group: "Content",
    useAsTitle: "filename",
    defaultColumns: ["filename", "alt", "updatedAt"],
    description: "Upload photos here, like WordPress. Then pick one on a post, or drop it into the article.",
  },
  access: {
    read: () => true,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  upload: {
    staticDir: path.resolve(dirname, "../../public/media"),
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      label: "Alt text",
      admin: { description: "Short description of the picture." },
    },
    {
      name: "caption",
      type: "text",
      label: "Caption",
    },
  ],
};
