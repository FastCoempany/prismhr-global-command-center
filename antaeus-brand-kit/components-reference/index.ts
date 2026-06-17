/**
 * The Antaeus component library (design-system spec 03).
 *
 * A composition language, not a kit of parts: four systems (Pulse,
 * Ribbon, Grounded, Offset), the un-nav (Wayfinder + Ctrl+K +
 * HandoffStrip), and a catalog where every component declares its
 * Family, its voice posture, and its density behavior (03 §4.2).
 *
 * The visual source of truth is the locked mockup at
 * deliverables/mockups/component-library-un-nav-full-2026-06-07.html;
 * tokens come from src/styles/tokens.css; consumers import
 * src/components/components.css once per page.
 *
 * Strings: components never invent operator copy. Every operator-
 * facing string arrives from the caller already declared through t()
 * (the few built-in defaults here are themselves declared).
 */
export * from "./contract";
export { Kicker, Heading, Stat, StatusChip, Gauge, Stamp, Avatar } from "./display";
export type { HeadingLevel } from "./display";
export { Button, IconButton, CrossRoomLink, Toggle } from "./action";
export type { ButtonVariant } from "./action";
export { TextInput, Textarea, Select, FormField } from "./input";
export { Card } from "./card";
export type { CardProps } from "./card";
export { Toast, Alert, Drawer, Modal, Tooltip } from "./feedback";
export type { AlertTone } from "./feedback";
export { WayfinderBar, SegmentedControl, HandoffStrip } from "./navigation";
export type { HandoffRoute, WayfinderCrumb, WayfinderPull } from "./navigation";
export {
    Ribbon,
    PulseTimeline,
    PulseZone,
    PulseHorizon
} from "./pulse";
export { Meter } from "./meter";
export { BrandMark, BrandLockup, BrandLockupSerif } from "./brand";
export { Table, Progress } from "./data";
export type { TableColumn, TableRow, Milestone } from "./data";
export { PatternCard, ProposalCard, ReadinessReadout, RiskCard } from "./system";
export {
    PageFrame,
    Grid,
    GridCell,
    Measure,
    BandStack,
    SingleColumn,
    FocalRail,
    ObjectControls
} from "./layout";
