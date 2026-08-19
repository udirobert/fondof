import { redirect } from "next/navigation";

/** Compose is now the Quick mode of the fond floor — land there explicitly. */
export default function ComposePage() {
  redirect("/?quick=1");
}
