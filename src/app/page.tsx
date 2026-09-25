import { redirect } from "next/navigation";

// The Board retired 2026-09-25 (dead-code ledger, section C). "/" stays a
// route because the brand mark on every page links here and the edge guard
// protects it; it lands on the HomeRoom, the app's home.
export default function RootPage() {
  redirect("/room");
}
