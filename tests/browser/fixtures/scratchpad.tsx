// The Scratchpaper as the root layout mounts it on every page
// (src/app/layout.tsx), over a page tall enough to scroll.

import { Scratchpad } from "@/components/scratch/scratchpad";

export default function Fixture() {
  return (
    <>
      <main style={{ height: 3000 }}>A page.</main>
      <Scratchpad />
    </>
  );
}
