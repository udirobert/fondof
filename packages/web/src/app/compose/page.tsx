import type { Metadata } from "next";
import { ComposeStudio } from "@/components/compose-studio";

export const metadata: Metadata = {
  title: "Compose — fondof",
  description:
    "One-shot skill composition: paste a URL or describe a need, add your repo, and get a fitted skill you can copy into your agent.",
  openGraph: {
    title: "Compose — fondof",
    description:
      "Paste a URL or describe a need, add your repo, and get a fitted skill.",
    url: "https://fondof.netlify.app/compose",
  },
};

export default function ComposePage() {
  return <ComposeStudio />;
}
