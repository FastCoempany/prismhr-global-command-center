import { redirect } from "next/navigation";

// The Book merged into the Account Room — every feature lives there now.
export default function BookPage() {
  redirect("/accounts");
}
