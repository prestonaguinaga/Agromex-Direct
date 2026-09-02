import { redirect } from "next/navigation";

/** Sheet 01 (dashboard) arrives in a later phase; until then home is the project index. */
export default function Home() {
  redirect("/projects");
}
