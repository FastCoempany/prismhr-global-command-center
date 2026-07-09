"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  captureToStash,
  deleteTrayItem,
  getTray,
  routeStash,
  routeStashToPartner,
  routeTrayItem,
  routeTrayItemToPartner,
  sharpenTrayItem,
} from "@/app/stash/actions";
import { STASH_LANES, type StashLane } from "@/lib/stash/summarize";
import type { StashTrayItem } from "@/lib/stash/data";
import styles from "./stash-dock.module.css";

type Chip = { x: number; y: number; text: string };
type Menu = { x: number; y: number; body: string; source: string; account: string };

const MIN_SEL = 3;
const MAX_SEL = 8000;

// Is the current selection inside a field the user is editing? If so we stay out
// of the way — no capture chip, native right-click menu.
function selectionInEditable(sel: Selection | null): boolean {
  if (!sel || sel.rangeCount === 0) return false;
  let node: Node | null = sel.anchorNode;
  while (node) {
    if (node instanceof HTMLElement) {
      if (
        node.tagName === "INPUT" ||
        node.tagName === "TEXTAREA" ||
        node.isContentEditable
      ) {
        return true;
      }
    }
    node = node.parentNode;
  }
  return false;
}

function selectionText(sel: Selection | null): string {
  if (!sel || sel.isCollapsed) return "";
  return sel.toString().trim();
}

export function StashDock() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [items, setItems] = useState<StashTrayItem[]>([]);
  const [partners, setPartners] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [chip, setChip] = useState<Chip | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragPartner, setDragPartner] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const refetch = useCallback(async () => {
    const t = await getTray();
    setItems(t.items);
    setPartners(t.partners);
    if (!t.available || !t.canWrite) setEnabled(false);
  }, []);

  // Mount: decide whether Stash is usable at all. If not, render nothing.
  useEffect(() => {
    let alive = true;
    getTray().then((t) => {
      if (!alive) return;
      setReady(true);
      setEnabled(t.available && t.canWrite);
      setItems(t.items);
      setPartners(t.partners);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Global capture listeners — only while Stash is usable.
  useEffect(() => {
    if (!enabled) return;

    // Highlight → a floating "＋ Stash" chip anchored to the selection.
    const onMouseUp = () => {
      window.setTimeout(() => {
        const sel = window.getSelection();
        const text = selectionText(sel);
        if (text.length < MIN_SEL || text.length > MAX_SEL || selectionInEditable(sel)) {
          setChip(null);
          return;
        }
        const rect = sel!.getRangeAt(0).getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
          setChip(null);
          return;
        }
        setChip({ x: rect.left + rect.width / 2, y: rect.top - 10, text });
      }, 0);
    };

    // Right-click → our lane menu, but only on a selection or a [data-stash]
    // element. Anywhere else, the native menu is left alone.
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.("[data-stash]") as HTMLElement | null;
      const sel = window.getSelection();
      const text = selectionText(sel);
      const hasSel = text.length >= MIN_SEL && !selectionInEditable(sel);
      if (!el && !hasSel) return;
      e.preventDefault();
      setChip(null);
      setMenu({
        x: e.clientX,
        y: e.clientY,
        body: el?.getAttribute("data-stash-label") || text,
        source: el ? el.getAttribute("data-stash-source") || "account" : "selection",
        account: el?.getAttribute("data-stash-account") || "",
      });
    };

    const dismiss = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest?.(`.${styles.chip}`) || t?.closest?.(`.${styles.menu}`)) return;
      setChip(null);
      setMenu(null);
    };
    const onScroll = () => {
      setChip(null);
      setMenu(null);
    };

    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("mousedown", dismiss);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("mousedown", dismiss);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [enabled]);

  const clearSelection = () => window.getSelection()?.removeAllRanges();

  // Highlight chip → capture into the tray (un-routed).
  const onChipCapture = async () => {
    if (!chip) return;
    const text = chip.text;
    setChip(null);
    clearSelection();
    const res = await captureToStash(text, "selection", "");
    if (res) {
      await refetch();
      flash("Stashed ✓");
    } else {
      flash("Couldn't stash");
    }
  };

  // Right-click menu → route straight to a lane.
  const onMenuRoute = async (lane: StashLane) => {
    if (!menu) return;
    const m = menu;
    setMenu(null);
    clearSelection();
    const res = await routeStash(m.body, m.source, m.account, lane);
    const meta = STASH_LANES.find((l) => l.key === lane);
    flash(res.ok ? `Sent to ${meta?.label} → ${meta?.lands}` : "Couldn't route");
  };
  // Right-click menu → route straight to a partner (lands as a dated note on
  // their outreach card + the Partner Room).
  const onMenuRoutePartner = async (partner: string) => {
    if (!menu) return;
    const m = menu;
    setMenu(null);
    clearSelection();
    const res = await routeStashToPartner(m.body, m.source, partner);
    flash(
      res.ok ? `Noted for ${partner.split(" ")[0]} → Partner outreach` : "Couldn't route",
    );
  };
  // Right-click menu → hold in the tray instead of routing now.
  const onMenuStash = async () => {
    if (!menu) return;
    const m = menu;
    setMenu(null);
    clearSelection();
    const res = await captureToStash(m.body, m.source, m.account);
    if (res) {
      await refetch();
      flash("Stashed ✓");
    }
  };

  // Tray row actions.
  const onRoute = async (id: string, lane: StashLane) => {
    setBusy(id);
    const res = await routeTrayItem(id, lane);
    await refetch();
    setBusy(null);
    const meta = STASH_LANES.find((l) => l.key === lane);
    flash(res.ok ? `Routed to ${meta?.label}` : "Couldn't route");
  };
  const onSharpen = async (id: string) => {
    setBusy(id);
    const res = await sharpenTrayItem(id);
    if (res)
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, micro: res.micro } : it)),
      );
    setBusy(null);
  };
  const onDelete = async (id: string) => {
    setBusy(id);
    await deleteTrayItem(id);
    await refetch();
    setBusy(null);
  };
  const onRoutePartner = async (id: string, partner: string) => {
    if (!partner) return;
    setBusy(id);
    const res = await routeTrayItemToPartner(id, partner);
    await refetch();
    setBusy(null);
    flash(res.ok ? `Noted for ${partner.split(" ")[0]}` : "Couldn't route");
  };
  // Drop dragged text straight onto a partner name in the panel.
  const onPartnerDrop = async (partner: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragPartner(null);
    const text = (e.dataTransfer.getData("text/plain") || "").trim();
    if (text.length < MIN_SEL) return;
    const res = await routeStashToPartner(text.slice(0, MAX_SEL), "drag", partner);
    flash(
      res.ok ? `Noted for ${partner.split(" ")[0]} → Partner outreach` : "Couldn't route",
    );
  };

  // Drag selected text (or a [data-stash] drag) onto the dock → capture.
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const text = (e.dataTransfer.getData("text/plain") || "").trim();
    if (text.length < MIN_SEL) return;
    const res = await captureToStash(text.slice(0, MAX_SEL), "drag", "");
    if (res) {
      await refetch();
      flash("Stashed ✓");
    }
  };

  if (!ready || !enabled) return null;

  const count = items.length;

  return (
    <>
      {/* Selection chip */}
      {chip && (
        <button
          type="button"
          className={styles.chip}
          style={{ left: chip.x, top: chip.y }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onChipCapture}
        >
          ＋ Stash
        </button>
      )}

      {/* Right-click lane menu */}
      {menu && (
        <div className={styles.menu} style={{ left: menu.x, top: menu.y }}>
          <div className={styles.menuHead}>Send to Stash</div>
          {STASH_LANES.map((l) => (
            <button
              key={l.key}
              type="button"
              className={styles.menuItem}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onMenuRoute(l.key)}
            >
              <span className={`${styles.dot} ${styles[`dot_${l.key}`]}`} />
              {l.label}
              <span className={styles.menuLands}>→ {l.lands}</span>
            </button>
          ))}
          {partners.length > 0 && (
            <>
              <div className={styles.menuSep} />
              <div className={styles.menuHead}>To a partner</div>
              {partners.map((p) => (
                <button
                  key={p}
                  type="button"
                  className={styles.menuItem}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onMenuRoutePartner(p)}
                >
                  <span className={`${styles.dot} ${styles.dot_partner}`} />
                  {p}
                </button>
              ))}
            </>
          )}
          <div className={styles.menuSep} />
          <button
            type="button"
            className={`${styles.menuItem} ${styles.menuItemDim}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={onMenuStash}
          >
            Hold in tray to sort later
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* Tray panel */}
      {open && (
        <div className={styles.panel} role="dialog" aria-label="Stash tray">
          <div className={styles.panelHead}>
            <span className={styles.panelTitle}>
              Stash tray {count > 0 && <span className={styles.panelCount}>{count}</span>}
            </span>
            <button
              type="button"
              className={styles.panelClose}
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
          </div>
          {count === 0 ? (
            <div className={styles.empty}>
              Nothing waiting. Highlight text, right-click, or drag anything here — it
              lands with a micro-note to sort into To-do, Follow-up, or Gap.
            </div>
          ) : (
            <div className={styles.rows}>
              {items.map((it) => (
                <div key={it.id} className={styles.row}>
                  <div className={styles.rowTop}>
                    <span className={styles.src}>{it.source || "capture"}</span>
                    <button
                      type="button"
                      className={styles.sharpen}
                      disabled={busy === it.id}
                      onClick={() => onSharpen(it.id)}
                      title="Tighten to one line"
                    >
                      ✨ Sharpen
                    </button>
                    <button
                      type="button"
                      className={styles.rowDel}
                      disabled={busy === it.id}
                      onClick={() => onDelete(it.id)}
                      aria-label="Discard"
                    >
                      ✕
                    </button>
                  </div>
                  <div className={styles.micro}>{it.micro || it.body}</div>
                  <div className={styles.seg}>
                    {STASH_LANES.map((l) => (
                      <button
                        key={l.key}
                        type="button"
                        className={`${styles.segBtn} ${styles[`seg_${l.key}`]}`}
                        disabled={busy === it.id}
                        onClick={() => onRoute(it.id, l.key)}
                      >
                        {l.label}
                      </button>
                    ))}
                    {partners.length > 0 && (
                      <select
                        className={styles.segPartner}
                        disabled={busy === it.id}
                        value=""
                        onChange={(e) => onRoutePartner(it.id, e.target.value)}
                        aria-label="Route to a partner"
                      >
                        <option value="" disabled>
                          → Partner…
                        </option>
                        {partners.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {partners.length > 0 && (
            <div className={styles.partnerZone}>
              <div className={styles.partnerZoneHead}>Partners — drop text on a name</div>
              <div className={styles.partnerChips}>
                {partners.map((p) => (
                  <span
                    key={p}
                    className={`${styles.partnerChip} ${dragPartner === p ? styles.partnerChipDrag : ""}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragPartner(p);
                    }}
                    onDragLeave={() => setDragPartner(null)}
                    onDrop={(e) => onPartnerDrop(p, e)}
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className={styles.panelFoot}>
            Right-click routes on the spot. Highlight &amp; drag land here — saved until
            you sort them. Anything routed to a partner shows on their outreach card on
            Today.
          </div>
        </div>
      )}

      {/* The dock button */}
      <button
        type="button"
        className={`${styles.dock} ${dragOver ? styles.dockDrag : ""}`}
        onClick={() => setOpen((v) => !v)}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        aria-label={`Stash tray, ${count} waiting`}
      >
        <span className={styles.dockIcon}>⬇</span>
        <span className={styles.dockLabel}>Stash</span>
        {count > 0 && <span className={styles.dockCount}>{count}</span>}
      </button>
    </>
  );
}
