import type { Access, FieldAccess, PayloadRequest, Where } from "payload";

/**
 * Staff roles for the admin panel.
 *
 * `owner` — the account that cannot be locked out of user management.
 * `admin` — full sales data, can invite staff, cannot create or demote owners.
 * `staff` — pipeline work; cannot delete PII rows or open Users.
 *
 * Anything weaker than "must be logged in" is a hole: Payload's default is
 * to allow an operation when access is omitted, including on `users`.
 */
export type Role = "owner" | "admin" | "staff";

type UserLike = {
  id?: number | string;
  role?: Role | null;
} | null;

export function roleOf(user: UserLike): Role | null {
  if (!user) return null;
  if (user.role === "owner" || user.role === "admin" || user.role === "staff") {
    return user.role;
  }
  return null;
}

export function hasRole(user: UserLike, ...roles: Role[]): boolean {
  const role = roleOf(user);
  return role !== null && roles.includes(role);
}

export const isLoggedIn: Access = ({ req }) => Boolean(req.user);

/**
 * Staff may see their own account (password change). Owners and admins see
 * the whole team. Unauthenticated listing of /api/users is closed.
 */
export const readUsers: Access = ({ req }) => {
  const user = req.user as UserLike;
  if (!user?.id) return false;
  if (hasRole(user, "owner", "admin")) return true;
  return { id: { equals: user.id } };
};

export const isOwner: Access = ({ req }) => hasRole(req.user as UserLike, "owner");

export const isAdmin: Access = ({ req }) =>
  hasRole(req.user as UserLike, "owner", "admin");

/** Create is closed on sales collections — public routes use overrideAccess. */
export const nobody: Access = () => false;

export const canDeleteSales: Access = ({ req }) =>
  hasRole(req.user as UserLike, "owner", "admin");

export const adminField: FieldAccess = ({ req }) =>
  hasRole(req.user as UserLike, "owner", "admin");

/** Tokens and secrets: never writable through the admin REST API. */
export const neverField: FieldAccess = () => false;

/**
 * Users.update: owners see everyone; admins see anyone who is not an owner;
 * staff may only patch themselves (name/password), never someone else's row.
 */
export const updateUsers: Access = ({ req }) => {
  const user = req.user as UserLike;
  if (!user?.id) return false;
  if (hasRole(user, "owner")) return true;
  if (hasRole(user, "admin")) {
    const constraint: Where = {
      or: [{ id: { equals: user.id } }, { role: { in: ["admin", "staff"] } }],
    };
    return constraint;
  }
  return { id: { equals: user.id } };
};

export const deleteUsers: Access = ({ req }) => {
  if (!hasRole(req.user as UserLike, "owner")) return false;
  /* Never delete an owner account from the list — demote first, and the
     last-owner hook still refuses even that. */
  return { role: { not_equals: "owner" } };
};

export function canAccessAdmin({ req }: { req: PayloadRequest }): boolean {
  return Boolean(req.user);
}

/**
 * Blog: signed-in staff see drafts. The public API and site only see published.
 */
export const readPublishedPosts: Access = ({ req }) => {
  if (req.user) return true;
  return { status: { equals: "published" } };
};
