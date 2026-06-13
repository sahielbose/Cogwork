import { redirect } from "next/navigation";

// The marketing home replaces this in Stage I; for now route into the studio.
export default function RootPage() {
  redirect("/app");
}
