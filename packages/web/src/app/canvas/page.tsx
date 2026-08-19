import { redirect } from "next/navigation";

/**
 * One product surface — floor lives at `/`. Keep query params so deep links
 * (e.g. /canvas?sample=1, /canvas?url=…, /canvas?forge=1) survive the redirect.
 */
export default async function CanvasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value !== undefined) qs.set(key, value);
  }
  redirect(qs.toString() ? `/?${qs.toString()}` : "/");
}
