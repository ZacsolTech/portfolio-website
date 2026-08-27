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
    description:
      "Upload photos here. On the live site they are stored in Vercel Blob — add BLOB_READ_WRITE_TOKEN in Vercel or photos will not appear after deploy.",
  },
  access: {
    read: () => true,
    create: isLoggedIn,
    update: isLoggedIn,
    delete: isLoggedIn,
  },
  upload: {
    staticDir: path.resolve(dirname, "../../public/media"),
    disableLocalStorage: process.env.VERCEL === "1",
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
  },
  hooks: {
    beforeValidate: [
      () => {
        if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
          throw new Error(
            "Add BLOB_READ_WRITE_TOKEN in Vercel (Storage → Blob) so photos are saved. Local disk is not kept on deploy.",
          );
        }
      },
    ],
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
