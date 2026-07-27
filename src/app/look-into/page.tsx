import { redirect } from "next/navigation";

// Look-into went live and folded into Today — the band anchors at #lookinto.
export default function LookIntoPage() {
  redirect("/today#lookinto");
}
