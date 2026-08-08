import { redirect } from "next/navigation";

/** One product surface — floor lives at `/`. */
export default function CanvasPage() {
  redirect("/");
}
