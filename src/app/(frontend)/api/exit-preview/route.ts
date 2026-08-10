import { draftMode } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request): Promise<Response> {
  const draft = await draftMode();
  draft.disable();

  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") || "/";

  if (!redirectTo.startsWith("/")) {
    redirect("/");
  }

  redirect(redirectTo);
}
