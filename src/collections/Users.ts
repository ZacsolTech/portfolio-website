import type { CollectionConfig } from "payload";
import {
  deleteUsers,
  hasRole,
  isAdmin,
  readUsers,
  roleOf,
  updateUsers,
  type Role,
} from "@/lib/access";

const LAST_OWNER = "There must be at least one owner account.";

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    /* 8 hours. A stolen cookie should not live for days. */
    tokenExpiration: 60 * 60 * 8,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    useAPIKey: false,
    useSessions: true,
    cookies: {
      /* Strict: a logged-in session cookie must not ride along on a
         cross-site GET to /api/leads. Lax would still send it. */
      sameSite: "Strict",
      secure: process.env.NODE_ENV === "production",
    },
    forgotPassword: {
      expiration: 60 * 60 * 1000,
    },
  },
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "name", "role"],
    group: "Team",
    description: "People who can sign in to this admin. Public sign-up is off.",
    hidden: ({ user }) => !hasRole(user as { role?: Role } | null, "owner", "admin"),
  },
  access: {
    /* Unauthenticated read of /api/users is the classic Payload leak. */
    admin: ({ req }) => Boolean(req.user),
    read: readUsers,
    create: isAdmin,
    update: updateUsers,
    delete: deleteUsers,
    unlock: isAdmin,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation, originalDoc }) => {
        if (!data) return data;

        /* First account (create-first-user) has no req.user. That person
           is the owner whether they picked a role or not. */
        if (operation === "create" && !req.user) {
          data.role = "owner";
          return data;
        }

        const actor = req.user as { id?: string | number; role?: Role } | null;

        if (operation === "create") {
          if (hasRole(actor, "admin") && data.role === "owner") {
            data.role = "staff";
          }
          if (!data.role) data.role = "staff";
          return data;
        }

        if (operation === "update" && originalDoc?.role === "owner" && data.role && data.role !== "owner") {
          const others = await req.payload.find({
            collection: "users",
            overrideAccess: true,
            limit: 1,
            depth: 0,
            where: {
              and: [
                { role: { equals: "owner" } },
                { id: { not_equals: originalDoc.id } },
              ],
            },
          });
          if (others.totalDocs < 1) {
            throw new Error(LAST_OWNER);
          }
        }

        /* Staff must not be able to write `role` even if a crafted request
           includes it. Admins cannot mint owners. */
        if (roleOf(actor) === "staff") {
          delete data.role;
        } else if (hasRole(actor, "admin") && data.role === "owner") {
          delete data.role;
        }

        return data;
      },
    ],
  },
  fields: [
    { name: "name", type: "text" },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "staff",
      index: true,
      saveToJWT: true,
      options: [
        { label: "Owner", value: "owner" },
        { label: "Admin", value: "admin" },
        { label: "Staff", value: "staff" },
      ],
      access: {
        /* Anyone signed in can see a colleague's role. Only owners assign it. */
        update: ({ req }) => hasRole(req.user as { role?: Role } | null, "owner"),
      },
      admin: {
        description:
          "Owner: users and deletes. Admin: sales + inviting staff. Staff: pipeline only.",
      },
    },
  ],
};
