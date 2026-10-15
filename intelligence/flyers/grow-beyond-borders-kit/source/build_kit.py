"""Grow Beyond Borders banner kit: every piece generated as clean, separable SVG.

Components (normalised, standalone files):
  background   gradient field (any aspect: preserveAspectRatio slice)
  halftone     the dot field that sits behind the headline
  plexus       the free geometric line-and-node mesh
  globe        sphere + atmosphere + dotted continents + network (+ each sub-layer alone)
  gbl-tile     the GBL app tile
  headline     "Help Your Clients Grow Beyond Borders" as outlines, plus a live-text copy

Layouts: one composed master SVG per surface size, every layer a named <g>.
"""

import json, math, os, re, sys
import numpy as np
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
from scipy.spatial import Delaunay, cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))          # .../grow-beyond-borders-kit/source
KIT = os.path.dirname(HERE)
COMP = os.path.join(KIT, "components", "svg")
LAY = os.path.join(KIT, "layouts", "svg")
for d in (COMP, LAY, os.path.join(HERE, "data")):
    os.makedirs(d, exist_ok=True)

# Inputs. The coastline file downloads on first run; Lato Bold is the Google Fonts release (SIL OFL),
# pointed at by GBB_LATO_BOLD or dropped in source/fonts/.
LAND_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-50m.json"
LAND_JSON = os.path.join(HERE, "data", "land-50m.json")
LATO_BOLD = os.environ.get("GBB_LATO_BOLD", os.path.join(HERE, "fonts", "Lato-Bold.ttf"))
LOGO_SVG = os.path.join(HERE, "prismhr-global-logo.svg")
if not os.path.exists(LAND_JSON):
    import urllib.request
    urllib.request.urlretrieve(LAND_URL, LAND_JSON)

# ---------------------------------------------------------------- palette
P = {
    "navy_hi": "#0A5696",   # lit blue, text corner
    "navy": "#073059",
    "navy_deep": "#061F3A",
    "night": "#081A33",
    "plum": "#3C1021",
    "maroon": "#57142B",
    "magenta": "#A0285A",
    "rose": "#D0779A",
    "cyan": "#76C4DD",
    "ice": "#8EE3F5",
    "lavender": "#C3B9E6",
    "pink": "#F07AA6",
    "dot": "#3E86C9",
    "white": "#FFFFFF",
}

R = 480.0  # globe radius in its own units
LON0, LAT0 = -8.0, 14.0
rng = np.random.default_rng(20261015)


def f1(v):
    s = f"{v:.1f}"
    return "0" if s in ("-0.0", "0.0") else s.rstrip("0").rstrip(".") if "." in s else s


# ---------------------------------------------------------------- land mask
def load_land_rings():
    topo = json.load(open(LAND_JSON))
    sc, tr = topo["transform"]["scale"], topo["transform"]["translate"]
    arcs = []
    for arc in topo["arcs"]:
        a = np.cumsum(np.array(arc, dtype=float), axis=0)
        a[:, 0] = a[:, 0] * sc[0] + tr[0]
        a[:, 1] = a[:, 1] * sc[1] + tr[1]
        arcs.append(a)
    rings = []
    geoms = topo["objects"]["land"]
    geoms = geoms["geometries"] if geoms["type"] == "GeometryCollection" else [geoms]
    for g in geoms:
        polys = g["arcs"] if g["type"] == "MultiPolygon" else [g["arcs"]]
        for poly in polys:
            for ring in poly:
                pts = []
                for i, ai in enumerate(ring):
                    a = arcs[ai] if ai >= 0 else arcs[~ai][::-1]
                    pts.append(a if i == 0 else a[1:])
                rings.append(np.vstack(pts))
    return rings


def land_mask(lon, lat, rings):
    inside = np.zeros(lon.shape, bool)
    for ring in rings:
        x0, y0 = ring[:, 0].min(), ring[:, 1].min()
        x1, y1 = ring[:, 0].max(), ring[:, 1].max()
        cand = np.where((lon >= x0) & (lon <= x1) & (lat >= y0) & (lat <= y1))[0]
        if len(cand) == 0:
            continue
        px, py = lon[cand], lat[cand]
        xa, ya = ring[:-1, 0], ring[:-1, 1]
        xb, yb = ring[1:, 0], ring[1:, 1]
        cross = np.zeros(len(cand), bool)
        for k in range(len(xa)):
            cond = (ya[k] > py) != (yb[k] > py)
            if not cond.any():
                continue
            xi = (xb[k] - xa[k]) * (py - ya[k]) / (yb[k] - ya[k] + 1e-12) + xa[k]
            cross ^= cond & (px < xi)
        inside[cand] ^= cross
    return inside


# ---------------------------------------------------------------- projection
def to_xyz(lon, lat):
    lo, la = np.radians(lon), np.radians(lat)
    return np.stack([np.cos(la) * np.cos(lo), np.cos(la) * np.sin(lo), np.sin(la)], -1)


def project(lon, lat, lon0=LON0, lat0=LAT0, r=R):
    lo, la = np.radians(lon), np.radians(lat)
    l0, p0 = math.radians(lon0), math.radians(lat0)
    x = r * np.cos(la) * np.sin(lo - l0)
    y = -r * (math.cos(p0) * np.sin(la) - math.sin(p0) * np.cos(la) * np.cos(lo - l0))
    z = math.sin(p0) * np.sin(la) + math.cos(p0) * np.cos(la) * np.cos(lo - l0)
    return x, y, z


def project_xyz(v, r=R):
    lon = np.degrees(np.arctan2(v[..., 1], v[..., 0]))
    lat = np.degrees(np.arcsin(np.clip(v[..., 2] / np.linalg.norm(v, axis=-1), -1, 1)))
    rad = np.linalg.norm(v, axis=-1)
    x, y, z = project(lon, lat)
    return x * rad, y * rad, z


# ---------------------------------------------------------------- globe
def build_globe():
    cache = os.path.join(HERE, "data", "land_grid.npz")
    step = 0.62
    lats, lons = [], []
    for la in np.arange(-62 + step / 2, 84, step):
        n = max(1, int(round(360 * math.cos(math.radians(la)) / step)))
        lo = (np.arange(n) + 0.5 * (int(la / step) % 2)) * 360.0 / n - 180
        lats.append(np.full(n, la))
        lons.append(lo)
    lat, lon = np.concatenate(lats), np.concatenate(lons)
    if os.path.exists(cache):
        m = np.load(cache)["m"]
    else:
        rings = load_land_rings()
        m = land_mask(lon, lat, rings)
        np.savez(cache, m=m)
    llon, llat = lon[m], lat[m]
    x, y, z = project(llon, llat)
    vis = z > 0.03
    x, y, z = x[vis], y[vis], z[vis]
    vlon, vlat = llon[vis], llat[vis]

    # continents: one round-capped dot per land cell, banded by depth so the file stays light
    bands = 10
    cont = []
    for b in range(bands):
        sel = np.where(np.minimum((z * bands).astype(int), bands - 1) == b)[0]
        if len(sel) == 0:
            continue
        zc = (b + 0.5) / bands
        op = 0.34 + 0.66 * zc ** 0.6
        sw = 3.1 * (0.45 + 0.55 * math.sqrt(zc))
        d = "".join(f"M{f1(x[k])} {f1(y[k])}h.01" for k in sel)
        cont.append(f'<path stroke-width="{sw:.2f}" opacity="{op:.2f}" d="{d}"/>')
    spark_idx = rng.choice(len(x), size=int(len(x) * 0.025), replace=False)
    spark = "".join(f"M{f1(x[k])} {f1(y[k])}h.01" for k in spark_idx if z[k] > 0.3)

    # network nodes: mostly over land, some over ocean
    nl = rng.choice(len(vlon), size=170, replace=False)
    land_nodes = to_xyz(vlon[nl], vlat[nl])
    u = rng.normal(size=(260, 3))
    u /= np.linalg.norm(u, axis=1, keepdims=True)
    nodes = np.vstack([land_nodes, u])
    nx, ny, nz = project_xyz(nodes)
    tree = cKDTree(nodes)
    edges = set()
    for a in range(len(nodes)):
        d, idx = tree.query(nodes[a], k=6)
        for dist, b in zip(d[1:], idx[1:]):
            if dist < 0.34:
                edges.add(tuple(sorted((a, int(b)))))
    link_bands = {}
    for a, b in edges:
        zz = min(nz[a], nz[b])
        if zz < -0.02:
            continue
        band = min(5, int(max(zz, 0) * 6))
        link_bands.setdefault(band, []).append(
            f'<line x1="{f1(nx[a])}" y1="{f1(ny[a])}" x2="{f1(nx[b])}" y2="{f1(ny[b])}"/>'
        )
    links = "".join(
        f'<g stroke-opacity="{0.12 + 0.6 * ((bnd + 0.5) / 6):.2f}">{"".join(v)}</g>'
        for bnd, v in sorted(link_bands.items())
    )

    # elevated flight arcs between land nodes
    arcs = []
    tries = 0
    while len(arcs) < 16 and tries < 4000:
        tries += 1
        a, b = rng.choice(len(land_nodes), size=2, replace=False)
        p1, p2 = land_nodes[a], land_nodes[b]
        ang = math.acos(np.clip(np.dot(p1, p2), -1, 1))
        if not (0.55 < ang < 1.5) or nz[a] < 0.25 or nz[b] < 0.25:
            continue
        t = np.linspace(0, 1, 48)[:, None]
        s = np.sin((1 - t) * ang) / math.sin(ang) * p1 + np.sin(t * ang) / math.sin(ang) * p2
        s *= (1 + 0.16 * ang * np.sin(np.pi * t))
        ax, ay, az = project_xyz(s)
        rad = np.hypot(ax, ay)
        ok = (az > 0) | (rad > R)
        if not ok.all():
            continue
        d = "M" + " ".join(f"{f1(px)},{f1(py)}" for px, py in zip(ax, ay))
        arcs.append(f'<path d="{d}"/>')
    # nodes and flares
    vis_n = np.where(nz > 0.02)[0]
    node_dots = "".join(
        f'<circle cx="{f1(nx[k])}" cy="{f1(ny[k])}" r="{f1(1.3 + 1.3 * nz[k])}" opacity="{0.35 + 0.65 * nz[k]:.2f}"/>'
        for k in vis_n
    )
    flare_pick = rng.choice(vis_n[nz[vis_n] > 0.25], size=34, replace=False)
    flares = []
    for k in flare_pick:
        col = "gbb-flare-cyan" if nx[k] < -150 else ("gbb-flare-pink" if nx[k] > 150 else "gbb-flare-white")
        rr = float(rng.uniform(7, 19))
        flares.append(
            f'<circle cx="{f1(nx[k])}" cy="{f1(ny[k])}" r="{f1(rr)}" fill="url(#{col})"/>'
            f'<circle cx="{f1(nx[k])}" cy="{f1(ny[k])}" r="{f1(1.6 + rr * 0.06)}" fill="#FFFFFF"/>'
        )

    limb = [(float(nx[k]), float(ny[k])) for k in vis_n if nz[k] < 0.4]

    defs = f"""
<linearGradient id="gbb-land" gradientUnits="userSpaceOnUse" x1="-{R:.0f}" y1="0" x2="{R:.0f}" y2="0">
  <stop offset="0" stop-color="#A5EEFF"/><stop offset=".5" stop-color="#DCD6F7"/><stop offset="1" stop-color="#FF8DB6"/></linearGradient>
<linearGradient id="gbb-net" gradientUnits="userSpaceOnUse" x1="-{R:.0f}" y1="0" x2="{R:.0f}" y2="0">
  <stop offset="0" stop-color="#6FD8FF"/><stop offset=".55" stop-color="#E8E4FF"/><stop offset="1" stop-color="#FF6FA0"/></linearGradient>
<radialGradient id="gbb-sphere" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="{R:.0f}">
  <stop offset="0" stop-color="#05172F" stop-opacity=".62"/><stop offset=".78" stop-color="#0A2A55" stop-opacity=".58"/>
  <stop offset=".95" stop-color="#173F74" stop-opacity=".6"/><stop offset="1" stop-color="#2D63A6" stop-opacity=".62"/></radialGradient>
<radialGradient id="gbb-light" gradientUnits="userSpaceOnUse" cx="-210" cy="-170" r="560">
  <stop offset="0" stop-color="#9FDCFF" stop-opacity=".16"/><stop offset="1" stop-color="#9FDCFF" stop-opacity="0"/></radialGradient>
<linearGradient id="gbb-atmo-color" gradientUnits="userSpaceOnUse" x1="-{R:.0f}" y1="0" x2="{R:.0f}" y2="0">
  <stop offset="0" stop-color="#4FD2FF"/><stop offset=".5" stop-color="#8F8CFF"/><stop offset="1" stop-color="#FF4F8B"/></linearGradient>
<radialGradient id="gbb-atmo-alpha" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="570">
  <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".78" stop-color="#fff" stop-opacity="0"/>
  <stop offset=".842" stop-color="#fff" stop-opacity=".5"/><stop offset=".875" stop-color="#fff" stop-opacity=".16"/>
  <stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<mask id="gbb-atmo-mask" maskUnits="userSpaceOnUse" x="-600" y="-600" width="1200" height="1200">
  <circle r="570" fill="url(#gbb-atmo-alpha)"/></mask>
<radialGradient id="gbb-flare-cyan"><stop offset="0" stop-color="#fff"/><stop offset=".14" stop-color="#7FE0FF" stop-opacity=".95"/><stop offset=".45" stop-color="#3FB8FF" stop-opacity=".28"/><stop offset="1" stop-color="#3FB8FF" stop-opacity="0"/></radialGradient>
<radialGradient id="gbb-flare-white"><stop offset="0" stop-color="#fff"/><stop offset=".14" stop-color="#EDE8FF" stop-opacity=".95"/><stop offset=".45" stop-color="#B7A8FF" stop-opacity=".25"/><stop offset="1" stop-color="#B7A8FF" stop-opacity="0"/></radialGradient>
<radialGradient id="gbb-flare-pink"><stop offset="0" stop-color="#fff"/><stop offset=".14" stop-color="#FF9CC0" stop-opacity=".95"/><stop offset=".45" stop-color="#FF4F8B" stop-opacity=".28"/><stop offset="1" stop-color="#FF4F8B" stop-opacity="0"/></radialGradient>
"""
    layers = {
        "globe-atmosphere": f'<circle r="570" fill="url(#gbb-atmo-color)" mask="url(#gbb-atmo-mask)"/>',
        "globe-sphere": f'<circle r="{R:.0f}" fill="url(#gbb-sphere)"/><circle r="{R:.0f}" fill="url(#gbb-light)"/>',
        "globe-continents": f'<g stroke="url(#gbb-land)" stroke-linecap="round" fill="none">{"".join(cont)}</g><path stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round" fill="none" opacity=".9" d="{spark}"/>',
        "globe-links": f'<g stroke="url(#gbb-net)" stroke-width="1.1" fill="none" stroke-linecap="round">{links}</g>',
        "globe-arcs": f'<g stroke="url(#gbb-net)" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".7">{"".join(arcs)}</g>',
        "globe-nodes": f'<g fill="#FFFFFF">{node_dots}</g>',
        "globe-flares": "".join(flares),
    }
    return defs, layers, limb


def globe_group(layers, keys=None):
    keys = keys or list(layers)
    net = [k for k in ("globe-links", "globe-arcs", "globe-nodes", "globe-flares") if k in keys]
    out = []
    for k in ("globe-atmosphere", "globe-sphere", "globe-continents"):
        if k in keys:
            out.append(f'<g id="{k}">{layers[k]}</g>')
    if net:
        out.append('<g id="globe-network">' + "".join(f'<g id="{k}">{layers[k]}</g>' for k in net) + "</g>")
    return "".join(out)


# ---------------------------------------------------------------- GBL tile
def build_tile():
    s = open(LOGO_SVG).read()
    paths = re.findall(r"<path[^>]*/>", s)
    facets, gbl = paths[:4], paths[4]
    k = 100 / 53.5
    inner = f'<g transform="scale({k:.5f}) translate(-416 -68)">'
    defs = """
<linearGradient id="gbb-tile-facet" x1="0" x2="1"><stop offset="0" stop-color="#22385F"/><stop offset="1" stop-color="#2B4A7E"/></linearGradient>
<linearGradient id="gbb-tile-face" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2F5A98"/><stop offset=".55" stop-color="#284C84"/><stop offset="1" stop-color="#23457A"/></linearGradient>
<linearGradient id="gbb-tile-rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E4EAF2"/><stop offset=".5" stop-color="#A9B4C4"/><stop offset="1" stop-color="#6E7B8F"/></linearGradient>
<clipPath id="gbb-tile-clip"><rect x="0" y="0" width="100" height="100" rx="12"/></clipPath>
<filter id="gbb-tile-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#020814" flood-opacity=".55"/></filter>
"""
    facets = [f.replace("url(#gr)", "url(#gbb-tile-facet)") for f in facets]
    body = (
        '<g filter="url(#gbb-tile-shadow)"><rect x="-3.2" y="-3.2" width="106.4" height="106.4" rx="15" fill="url(#gbb-tile-rim)"/></g>'
        '<g clip-path="url(#gbb-tile-clip)"><rect width="100" height="100" fill="url(#gbb-tile-face)"/>'
        + inner + "".join(facets) + "</g></g>"
        + inner + gbl + "</g>"
    )
    return defs, body


# ---------------------------------------------------------------- headline
HEAD_LINES = ["Help Your", "Clients Grow", "Beyond Borders"]


def shape_lines(lines, size=100.0, leading=1.13):
    blob = hb.Blob.from_file_path(LATO_BOLD)
    face = hb.Face(blob)
    font = hb.Font(face)
    tt = TTFont(LATO_BOLD)
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    upem = tt["head"].unitsPerEm
    sc = size / upem
    d_all, widths = [], []
    global BOUNDS
    BOUNDS = BoundsPen(gs)
    for li, text in enumerate(lines):
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(font, buf, {"kern": True, "liga": True})
        x = 0
        base = size * 0.0 + li * size * leading
        pen = SVGPathPen(gs, lambda v: f1(v) if abs(v) >= 0.05 else "0")
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            gname = order[info.codepoint]
            tf = (sc, 0, 0, -sc, (x + pos.x_offset) * sc, base - pos.y_offset * sc)
            gs[gname].draw(TransformPen(pen, tf))
            gs[gname].draw(TransformPen(BOUNDS, tf))
            x += pos.x_advance
        widths.append(x * sc)
        d_all.append(pen.getCommands())
    cap = tt["OS/2"].sCapHeight * sc
    return d_all, widths, cap


# ---------------------------------------------------------------- halftone + plexus + background
def halftone(W, H, pitch, region, color=P["dot"], opacity=0.34, seed=1):
    """Dot grid whose dot size follows a soft ripple, fading out of `region` (x0,y0,x1,y1 as fractions)."""
    x0, y0, x1, y1 = region
    cx, cy = (-0.15 * W, 1.25 * H)
    out = []
    ys = np.arange(pitch / 2, H, pitch)
    xs = np.arange(pitch / 2, W, pitch)
    for gy in ys:
        for gx in xs:
            u, v = gx / W, gy / H
            fx = np.clip((x1 - u) / max(x1 - x0, 1e-6), 0, 1) if u > x0 else 1.0
            fy = np.clip((y1 - v) / max(y1 - y0, 1e-6), 0, 1) if v > y0 else 1.0
            fade = (fx * min(1.0, 0.35 + fy)) ** 1.2
            dist = math.hypot(gx - cx, gy - cy) / pitch
            ripple = 0.5 + 0.5 * math.sin(dist / 3.1)
            r = pitch * 0.27 * fade * (0.25 + 0.75 * ripple)
            if r > pitch * 0.05:
                out.append(f'<circle cx="{f1(gx)}" cy="{f1(gy)}" r="{f1(r)}"/>')
    return f'<g fill="{color}" opacity="{opacity}">{"".join(out)}</g>'


def plexus(W, H, n, link, seed, avoid=None, anchors=(), weight=None, stroke="url(#gbb-plexus)", node_r=1.4,
           avoid_rect=None):
    """Random node mesh. avoid=(cx,cy,r) keeps points out of a disk, avoid_rect=(x0,y0,x1,y1) out of the
    headline; anchors join the mesh but do not draw."""
    rs = np.random.default_rng(seed)
    pts = []
    guard = 0
    while len(pts) < n and guard < 200000:
        guard += 1
        p = rs.uniform([-0.04 * W, -0.06 * H], [1.04 * W, 1.06 * H])
        if avoid and math.hypot(p[0] - avoid[0], p[1] - avoid[1]) < avoid[2]:
            continue
        if avoid_rect and avoid_rect[0] < p[0] < avoid_rect[2] and avoid_rect[1] < p[1] < avoid_rect[3]:
            continue
        if weight and rs.uniform() > weight(p[0], p[1]):
            continue
        pts.append(p)
    pts = np.array(pts)
    allp = np.vstack([pts, np.array(anchors)]) if len(anchors) else pts
    tri = Delaunay(allp)
    edges = set()
    for s in tri.simplices:
        for i in range(3):
            a, b = sorted((int(s[i]), int(s[(i + 1) % 3])))
            edges.add((a, b))
    lines_by = {}
    for a, b in edges:
        if a >= len(pts) and b >= len(pts):
            continue
        L = np.linalg.norm(allp[a] - allp[b])
        if L > link:
            continue
        if avoid_rect and seg_hits_rect(allp[a], allp[b], avoid_rect):
            continue
        band = min(4, int((1 - L / link) * 5))
        lines_by.setdefault(band, []).append(
            f'<line x1="{f1(allp[a][0])}" y1="{f1(allp[a][1])}" x2="{f1(allp[b][0])}" y2="{f1(allp[b][1])}"/>'
        )
    lines = "".join(
        f'<g stroke-opacity="{0.10 + 0.5 * ((b + 0.5) / 5):.2f}">{"".join(v)}</g>' for b, v in sorted(lines_by.items())
    )
    dots = "".join(
        f'<circle cx="{f1(p[0])}" cy="{f1(p[1])}" r="{f1(node_r * rs.uniform(0.6, 1.4))}" opacity="{rs.uniform(0.35, 0.95):.2f}"/>'
        for p in pts
    )
    return (
        f'<g id="plexus-links" stroke="{stroke}" stroke-width="1" fill="none">{lines}</g>'
        f'<g id="plexus-nodes" fill="#FFFFFF">{dots}</g>'
    )


def seg_hits_rect(p, q, r):
    for t in np.linspace(0, 1, 24):
        x, y = p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t
        if r[0] < x < r[2] and r[1] < y < r[3]:
            return True
    return False


def plexus_defs(x0, x1):
    return (
        f'<linearGradient id="gbb-plexus" gradientUnits="userSpaceOnUse" x1="{f1(x0)}" y1="0" x2="{f1(x1)}" y2="0">'
        '<stop offset="0" stop-color="#6FD8FF"/><stop offset=".5" stop-color="#C9C2FF"/><stop offset="1" stop-color="#FF6FA0"/></linearGradient>'
    )


def background(W, H, text_corner, globe_c, globe_r):
    """Navy field, lit blue at the text corner, magenta warmth on the globe's far side."""
    tx, ty = text_corner
    gx, gy = globe_c
    # gradient axis: text corner -> beyond the globe
    vx, vy = gx - tx, gy - ty
    n = math.hypot(vx, vy) or 1
    ex, ey = gx + vx / n * globe_r * 1.1, gy + vy / n * globe_r * 1.1
    mg_x, mg_y = gx + vx / n * globe_r * 0.55, gy - globe_r * 0.35
    defs = f"""
<linearGradient id="gbb-bg-base" gradientUnits="userSpaceOnUse" x1="{f1(tx)}" y1="{f1(ty)}" x2="{f1(ex)}" y2="{f1(ey)}">
  <stop offset="0" stop-color="#08467F"/><stop offset=".28" stop-color="{P['navy']}"/><stop offset=".55" stop-color="{P['navy_deep']}"/>
  <stop offset=".8" stop-color="#2A1033"/><stop offset="1" stop-color="{P['maroon']}"/></linearGradient>
<radialGradient id="gbb-bg-blue" gradientUnits="userSpaceOnUse" cx="{f1(tx)}" cy="{f1(ty)}" r="{f1(max(W, H) * 0.55)}">
  <stop offset="0" stop-color="{P['navy_hi']}" stop-opacity=".85"/><stop offset="1" stop-color="{P['navy_hi']}" stop-opacity="0"/></radialGradient>
<radialGradient id="gbb-bg-magenta" gradientUnits="userSpaceOnUse" cx="{f1(mg_x)}" cy="{f1(mg_y)}" r="{f1(globe_r * 1.05)}">
  <stop offset="0" stop-color="{P['magenta']}" stop-opacity=".75"/><stop offset=".6" stop-color="{P['magenta']}" stop-opacity=".25"/><stop offset="1" stop-color="{P['magenta']}" stop-opacity="0"/></radialGradient>
<linearGradient id="gbb-bg-floor" x1="0" y1="0" x2="0" y2="1">
  <stop offset=".55" stop-color="{P['night']}" stop-opacity="0"/><stop offset="1" stop-color="{P['night']}" stop-opacity=".55"/></linearGradient>
"""
    body = (
        f'<rect width="{W}" height="{H}" fill="url(#gbb-bg-base)"/>'
        f'<rect width="{W}" height="{H}" fill="url(#gbb-bg-blue)"/>'
        f'<rect width="{W}" height="{H}" fill="url(#gbb-bg-magenta)"/>'
        f'<rect width="{W}" height="{H}" fill="url(#gbb-bg-floor)"/>'
    )
    return defs, body


def svg_doc(W, H, defs, body, title, extra_attr=""):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {f1(W)} {f1(H)}" width="{f1(W)}" height="{f1(H)}"{extra_attr}>'
        f"<title>{title}</title><defs>{defs}</defs>{body}</svg>\n"
    )


def svg_doc_vb(vb, w, h, defs, body, title):
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" width="{w}" height="{h}">'
        f"<title>{title}</title><defs>{defs}</defs>{body}</svg>\n"
    )


# ---------------------------------------------------------------- layouts
SIZES = [
    # name, W, H, surface
    ("web-banner-3x1", 1500, 500, "Webinar / web hero banner, email header (scales to 600x200, 1200x400)"),
    ("web-hero-1920x640", 1920, 640, "Full-width web hero"),
    ("linkedin-banner-1584x396", 1584, 396, "LinkedIn page / profile banner"),
    ("x-header-1500x500", 1500, 500, "X / Twitter header"),
    ("leaderboard-728x90", 728, 90, "Display ad leaderboard"),
    ("link-preview-1200x628", 1200, 628, "Link preview / Open Graph / LinkedIn post image"),
    ("slide-16x9-1920x1080", 1920, 1080, "Presentation title slide, Zoom/Teams background, video title card"),
    ("social-square-1080", 1080, 1080, "Instagram / LinkedIn square post"),
    ("social-portrait-1080x1350", 1080, 1350, "Instagram / LinkedIn portrait post"),
    ("story-1080x1920", 1080, 1920, "Story / reel / mobile full screen"),
    ("display-300x250", 300, 250, "Display ad medium rectangle"),
]


def layout(W, H):
    """Text-aware placement. The headline is sized first; the globe takes the room the headline leaves,
    so dots never sit under letters."""
    a = W / H
    one = [" ".join(HEAD_LINES)]
    _, w1, cap = shape_lines(one, size=100.0)
    _, w3, _ = shape_lines(HEAD_LINES, size=100.0)
    w1, w3 = w1[0] / 100.0, max(w3) / 100.0      # widths per unit of font size
    cap /= 100.0
    lead = 1.13
    if a >= 5:  # ultra-wide strip: one line, globe + tile on the right
        tx = H * 0.42
        room = W - 2.55 * H - tx
        fs = min(H * 0.30, room / w1)
        gR = H * 1.2
        gcy = H * 0.78
        gcx = W - H * 1.2
        tile = H * 0.6
        return dict(lines=one, fs=fs, tx=tx, top=H / 2 - cap * fs / 2, gR=gR, gcx=gcx, gcy=gcy,
                    tile=tile, tcx=gcx - H * 0.05, tcy=H * 0.5)
    if a >= 1.4:  # banner / landscape: headline left, globe right
        banner = a >= 2.2
        fs = H * (0.135 if banner else 0.105)
        tx = H * 0.17 if banner else W * 0.065
        block = cap * fs + 2 * lead * fs
        text_right = tx + w3 * fs
        kx = 1.0 if banner else 0.82           # globe centre sits kx*R in from the right edge
        R_pref = H * (0.88 if banner else 0.62)
        R_fit = (W - text_right - fs * 0.3) / (1 + kx)
        gR = max(H * 0.45, min(R_pref, R_fit))
        gcx = W - kx * gR
        gcy = H * (0.54 if banner else 0.53)
        tile = gR * (0.48 if banner else 0.42)
        return dict(lines=HEAD_LINES, fs=fs, tx=tx, top=H / 2 - block / 2, gR=gR, gcx=gcx, gcy=gcy,
                    tile=tile, tcx=gcx + 0.01 * gR, tcy=gcy - 0.03 * gR)
    # square, portrait, story: headline on top, globe rising from the bottom
    tall = a < 0.7
    fs = W * (0.112 if tall else (0.098 if a < 0.9 else 0.088))
    fs = min(fs, W * 0.84 / w3)
    tx = W * (0.08 if a < 0.9 else 0.075)
    top = H * (0.11 if tall else 0.085)
    block = cap * fs + 2 * lead * fs
    globe_top = top + block + fs * (0.9 if tall else 0.65)
    gR = W * (0.86 if tall else (0.72 if a < 0.9 else 0.64))
    gcx = W * 0.56
    gcy = globe_top + gR
    tile = W * (0.25 if a < 0.9 else 0.22)
    tcy = gcy - gR * (0.42 if tall else 0.52)
    return dict(lines=HEAD_LINES, fs=fs, tx=tx, top=top, gR=gR, gcx=gcx, gcy=gcy,
                tile=tile, tcx=gcx, tcy=tcy)


def compose(W, H, gdefs, glayers, limb, tdefs, tbody):
    L = layout(W, H)
    d_lines, widths, cap = shape_lines(L["lines"], size=100.0)
    k = L["fs"] / 100.0
    leading = 113.0
    block_h = cap * k + (len(L["lines"]) - 1) * leading * k
    top = L["top"]
    base0 = top + cap * k
    tx = L["tx"]
    head = "".join(
        f'<path d="{d}" transform="translate({f1(tx)} {f1(base0)}) scale({k:.4f})"/>' for d in d_lines
    )
    gR, gcx, gcy = L["gR"], L["gcx"], L["gcy"]
    gs = gR / R
    tsize = L["tile"]
    tcx, tcy = L["tcx"], L["tcy"]
    pitch = max(6.0, min(W, H) / 34.0) if W / H < 5 else H / 11.0
    text_right = tx + max(widths) * k
    region = (0.0, 0.0, min(0.95, (text_right + pitch * 4) / W), min(1.0, (top + block_h + pitch * 6) / H))
    bdefs, bbody = background(W, H, (tx * 0.4, top * 0.5), (gcx, gcy), gR)
    ht = halftone(W, H, pitch, region)
    anchors = [(gcx + x * gs, gcy + y * gs) for x, y in limb]
    reach = gR * 0.9

    def wgt(x, y):
        d = math.hypot(x - gcx, y - gcy)
        return float(np.clip(1.1 - (d - gR) / reach, 0.0, 1))

    pad = L["fs"] * 0.35
    text_rect = (tx - pad, top - pad, text_right + pad, top + block_h + L["fs"] * 0.3 + pad)
    n_plex = int(np.clip(W * H / (gR * gR) * 5, 18, 70))
    plex = plexus(W, H, n_plex, link=gR * 0.5, seed=int(W * 7 + H), avoid=(gcx, gcy, gR * 1.02),
                  anchors=anchors, weight=wgt, node_r=max(0.9, gR / 300), avoid_rect=text_rect)
    defs = bdefs + gdefs + tdefs + plexus_defs(gcx - gR * 1.4, gcx + gR * 1.4)
    body = (
        f'<g id="background">{bbody}</g>'
        f'<g id="halftone">{ht}</g>'
        f'<g id="plexus" opacity=".75">{plex}</g>'
        f'<g id="globe" transform="translate({f1(gcx)} {f1(gcy)}) scale({gs:.5f})">{globe_group(glayers)}</g>'
        f'<g id="gbl-tile" transform="translate({f1(tcx - tsize / 2)} {f1(tcy - tsize / 2)}) scale({tsize / 100:.5f})">{tbody}</g>'
        f'<g id="headline" fill="#FFFFFF">{head}</g>'
    )
    return defs, body


def main():
    gdefs, glayers, limb = build_globe()
    tdefs, tbody = build_tile()

    # ---- standalone components
    vb = "-620 -620 1240 1240"
    open(os.path.join(COMP, "globe.svg"), "w").write(
        svg_doc_vb(vb, 1240, 1240, gdefs, globe_group(glayers), "Globe (complete)"))
    for name, keys in [
        ("globe-continents", ["globe-sphere", "globe-continents"]),
        ("globe-continents-only", ["globe-continents"]),
        ("globe-network-only", ["globe-links", "globe-arcs", "globe-nodes", "globe-flares"]),
        ("globe-atmosphere-only", ["globe-atmosphere"]),
        ("globe-no-network", ["globe-atmosphere", "globe-sphere", "globe-continents"]),
    ]:
        open(os.path.join(COMP, f"{name}.svg"), "w").write(
            svg_doc_vb(vb, 1240, 1240, gdefs, globe_group(glayers, keys), name.replace("-", " ").title()))
    open(os.path.join(COMP, "gbl-tile.svg"), "w").write(
        svg_doc_vb("-12 -10 124 128", 496, 512, tdefs, tbody, "GBL tile"))
    # headline outlines, stacked + one-line
    for name, lines in [("headline-stacked", HEAD_LINES), ("headline-one-line", [" ".join(HEAD_LINES)])]:
        d_lines, widths, cap = shape_lines(lines, size=100.0)
        x0, y0, x1, y1 = BOUNDS.bounds
        body = '<g fill="#FFFFFF">' + "".join(f'<path d="{d}"/>' for d in d_lines) + "</g>"
        w, h = x1 - x0 + 8, y1 - y0 + 8
        open(os.path.join(COMP, f"{name}.svg"), "w").write(
            svg_doc_vb(f"{f1(x0 - 4)} {f1(y0 - 4)} {f1(w)} {f1(h)}", int(round(w)), int(round(h)), "", body,
                       "Headline (outlined)"))
    # live-text headline for editing
    live = (
        '<style>text{font-family:Lato,"Helvetica Neue",Arial,sans-serif;font-weight:700;font-size:100px;fill:#fff}</style>'
        + "".join(f'<text x="0" y="{72 + 113 * i}">{t}</text>' for i, t in enumerate(HEAD_LINES))
    )
    open(os.path.join(COMP, "headline-live-text.svg"), "w").write(
        svg_doc_vb("-4 -4 820 340", 820, 340, "", live, "Headline (live text, needs Lato Bold)"))
    # background, halftone, plexus at a neutral 1600x900
    W, H = 1600, 900
    bdefs, bbody = background(W, H, (120, 80), (1150, 470), 520)
    open(os.path.join(COMP, "background.svg"), "w").write(
        svg_doc(W, H, bdefs, bbody, "Background field", ' preserveAspectRatio="xMidYMid slice"'))
    open(os.path.join(COMP, "halftone.svg"), "w").write(
        svg_doc(W, H, "", halftone(W, H, 16, (0, 0, 0.9, 1.0), opacity=0.55), "Halftone dot field"))
    open(os.path.join(COMP, "plexus.svg"), "w").write(
        svg_doc(W, H, plexus_defs(0, W), plexus(W, H, 120, link=210, seed=7, node_r=1.8), "Plexus mesh"))

    # ---- composed layouts
    manifest = []
    for name, W, H, surface in SIZES:
        defs, body = compose(W, H, gdefs, glayers, limb, tdefs, tbody)
        open(os.path.join(LAY, f"{name}.svg"), "w").write(
            svg_doc(W, H, defs, body, f"Help Your Clients Grow Beyond Borders - {name}"))
        manifest.append((name, W, H, surface))
    json.dump(manifest, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
    print("ok", len(manifest))


if __name__ == "__main__":
    main()
