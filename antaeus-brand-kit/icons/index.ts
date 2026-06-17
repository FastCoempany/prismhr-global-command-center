/**
 * The icon system barrel (spec 09). Consumers import { Icon } and use
 * <Icon name="..." />; per-glyph components are exported for the rare
 * direct-import case. ICON_NAMES is the typed inventory.
 */
export { Icon, type IconProps } from "./Icon";
export { ICON_NAMES, GLYPHS, DEFAULT_ACCENTS, type IconName } from "./manifest";
export type { IconSize, IconAccent, GlyphProps } from "./glyph";
