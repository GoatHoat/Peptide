"""
7-DAY STREAK BADGE v3 — the ring is copper now.
Verified by actually rendering it, not by guessing.

v2 fixes retained:
  · softbox environment so the metal has something to REFLECT
    (bare lights were why the ring rendered white)
  · Voronoi hammered texture on the flame, not Noise
  · big flat chamfer on the numeral so one facet lights and one goes dark
  · inscription set per-character around an arc, with a gap cut in the groove
  · flame scaled so its tip and base just touch the ring opening
  · "COPPER" removed

Blender 5.1. Scripting tab -> Text > Open -> Run Script -> F12.
"""

import bpy, math, os
from mathutils import Vector

# ─────────────────────────────────────────────────────────────
OUT_DIR   = r"C:\Users\deeka\Desktop\badge_frames"
RES       = 640
FRAMES    = 120
SAMPLES   = 160

GLYPH     = "7"
INSCRIPT  = "DAY STREAK"

R_OUT     = 1.00
R_IN      = 0.674
RING_D    = 0.22
GROOVES   = (0.800, 0.865, 0.900)
GROOVE_W  = 0.009

FLAME_D   = 0.050
NUM_SIZE  = 0.78
NUM_D     = 0.050
NUM_BEVEL = 0.034          # big chamfer — this is what facets the 7
NUM_Z     = 0.140

TEXT_R    = 0.775
TEXT_SIZE = 0.062
TEXT_SPAN = 42             # degrees the inscription occupies

COPPER    = (0.620, 0.290, 0.130, 1.0)   # deep. a metal's base colour IS its
                                         # reflectance — pale values go white.
FIRE_COL  = (0.300, 0.140, 0.070, 1.0)
CAM_LIFT  = 12
CAM_DIST  = 5.4            # whole badge in frame, nothing cropped

HDRI_PATH = ""             # optional. leave blank to use the softboxes.

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\georgiab.ttf",
    r"C:\Windows\Fonts\constanb.ttf",
    r"C:\Windows\Fonts\timesbd.ttf",
]
SMALL_FONT = [
    r"C:\Windows\Fonts\segoeui.ttf",
    r"C:\Windows\Fonts\arial.ttf",
]
# ─────────────────────────────────────────────────────────────

FLAME = [
    (0.0230, -0.6699),
    (-0.0544, -0.6663),
    (-0.0949, -0.6607),
    (-0.1447, -0.6496),
    (-0.1981, -0.6312),
    (-0.2516, -0.5962),
    (-0.3078, -0.5364),
    (-0.3078, -0.5326),
    (-0.3225, -0.5161),
    (-0.3520, -0.4626),
    (-0.3649, -0.4312),
    (-0.3797, -0.3833),
    (-0.3889, -0.3409),
    (-0.3926, -0.3023),
    (-0.3926, -0.2451),
    (-0.3852, -0.1935),
    (-0.3742, -0.1475),
    (-0.3539, -0.0903),
    (-0.3446, -0.0442),
    (-0.3446, -0.0203),
    (-0.3502, 0.0092),
    (-0.3456, 0.0138),
    (-0.3290, 0.0120),
    (-0.3180, 0.0046),
    (-0.3041, -0.0111),
    (-0.2949, -0.0258),
    (-0.2857, -0.0516),
    (-0.2783, -0.0922),
    (-0.2645, -0.1078),
    (-0.2516, -0.1097),
    (-0.2378, -0.0940),
    (-0.2341, -0.0811),
    (-0.2341, -0.0553),
    (-0.2433, -0.0147),
    (-0.2580, 0.0258),
    (-0.2728, 0.0811),
    (-0.2746, 0.1401),
    (-0.2691, 0.1696),
    (-0.2654, 0.1788),
    (-0.2580, 0.1825),
    (-0.2525, 0.2027),
    (-0.2322, 0.2396),
    (-0.2101, 0.2672),
    (-0.2101, 0.2709),
    (-0.1889, 0.2921),
    (-0.1816, 0.2921),
    (-0.1788, 0.2893),
    (-0.1751, 0.2765),
    (-0.1751, 0.2636),
    (-0.1788, 0.2543),
    (-0.1843, 0.2138),
    (-0.1843, 0.1935),
    (-0.1788, 0.1732),
    (-0.1686, 0.1613),
    (-0.1594, 0.1576),
    (-0.1410, 0.1594),
    (-0.1290, 0.1714),
    (-0.1217, 0.1935),
    (-0.1217, 0.2120),
    (-0.1327, 0.2783),
    (-0.1327, 0.3372),
    (-0.1272, 0.3391),
    (-0.1198, 0.3760),
    (-0.0996, 0.4221),
    (-0.0756, 0.4552),
    (-0.0756, 0.4645),
    (-0.0387, 0.5142),
    (-0.0129, 0.5658),
    (-0.0037, 0.6064),
    (-0.0037, 0.6432),
    (-0.0092, 0.6598),
    (-0.0083, 0.6699),
    (0.0027, 0.6681),
    (0.0184, 0.6543),
    (0.0184, 0.6488),
    (0.0258, 0.6451),
    (0.0258, 0.6395),
    (0.0332, 0.6358),
    (0.0498, 0.6064),
    (0.0590, 0.5787),
    (0.0626, 0.5585),
    (0.0626, 0.5124),
    (0.0553, 0.4645),
    (0.0516, 0.4626),
    (0.0516, 0.4460),
    (0.0442, 0.4294),
    (0.0442, 0.3963),
    (0.0479, 0.3889),
    (0.0498, 0.3686),
    (0.0663, 0.3299),
    (0.1050, 0.2746),
    (0.1143, 0.2709),
    (0.1493, 0.2101),
    (0.1594, 0.2018),
    (0.1742, 0.2018),
    (0.1788, 0.2046),
    (0.1862, 0.2211),
    (0.1880, 0.2543),
    (0.1751, 0.2875),
    (0.1751, 0.3041),
    (0.1686, 0.3050),
    (0.1659, 0.3115),
    (0.1659, 0.3336),
    (0.1686, 0.3364),
    (0.1779, 0.3364),
    (0.1852, 0.3327),
    (0.2193, 0.3004),
    (0.2506, 0.2617),
    (0.2802, 0.2120),
    (0.2875, 0.1862),
    (0.2949, 0.1843),
    (0.3023, 0.1603),
    (0.3096, 0.1124),
    (0.3096, 0.0571),
    (0.3023, 0.0129),
    (0.2930, -0.0221),
    (0.2875, -0.0277),
    (0.2875, -0.0350),
    (0.2765, -0.0608),
    (0.2709, -0.0626),
    (0.2654, -0.0737),
    (0.2617, -0.1143),
    (0.2636, -0.1438),
    (0.2709, -0.1640),
    (0.2829, -0.1760),
    (0.2940, -0.1760),
    (0.3031, -0.1723),
    (0.3096, -0.1659),
    (0.3096, -0.1603),
    (0.3133, -0.1585),
    (0.3151, -0.1419),
    (0.3133, -0.0811),
    (0.3188, -0.0626),
    (0.3318, -0.0590),
    (0.3354, -0.0442),
    (0.3511, -0.0267),
    (0.3585, -0.0212),
    (0.3677, -0.0212),
    (0.3705, -0.0240),
    (0.3705, -0.0405),
    (0.3649, -0.0590),
    (0.3631, -0.0811),
    (0.3649, -0.1106),
    (0.3852, -0.2083),
    (0.3926, -0.2617),
    (0.3907, -0.3520),
    (0.3760, -0.4239),
    (0.3594, -0.4700),
    (0.3428, -0.5050),
    (0.3318, -0.5234),
    (0.3244, -0.5271),
    (0.2949, -0.5676),
    (0.2424, -0.6165),
    (0.2276, -0.6257),
    (0.1963, -0.6386),
    (0.1225, -0.6589),
    (0.0765, -0.6663),
    (0.0230, -0.6699),
]

scene = bpy.context.scene
notes = []

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for blk in (bpy.data.meshes, bpy.data.materials, bpy.data.objects,
            bpy.data.lights, bpy.data.cameras, bpy.data.curves,
            bpy.data.worlds, bpy.data.fonts):
    for it in list(blk):
        if it.users == 0:
            blk.remove(it)

# Standard keeps copper saturated. AgX and PBR Neutral both desaturate
# highlights toward white, which is half of why the ring looked bleached.
for tf in ('Standard', 'Khronos PBR Neutral', 'AgX'):
    try:
        scene.view_settings.view_transform = tf
        notes.append(f"View     : {tf}"); break
    except Exception:
        continue

def set_in(node, names, val):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = val; return True
    return False

def activate(o):
    bpy.ops.object.select_all(action='DESELECT')
    o.select_set(True); bpy.context.view_layer.objects.active = o

def smooth(o, deg=40):
    activate(o)
    for a in ("op","legacy","plain"):
        try:
            if a=="op":
                bpy.ops.object.shade_auto_smooth(angle=math.radians(deg)); return
            if a=="legacy":
                o.data.use_auto_smooth = True
                o.data.auto_smooth_angle = math.radians(deg)
                bpy.ops.object.shade_smooth(); return
            bpy.ops.object.shade_smooth(); return
        except Exception:
            continue

def base_mat(name):
    m = bpy.data.materials.new(name)
    if getattr(m, "node_tree", None) is None and hasattr(m, "use_nodes"):
        m.use_nodes = True
    b = next((n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED'), None)
    if b is None:
        b = m.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        o = next((n for n in m.node_tree.nodes if n.type=='OUTPUT_MATERIAL'), None) \
            or m.node_tree.nodes.new("ShaderNodeOutputMaterial")
        m.node_tree.links.new(b.outputs[0], o.inputs["Surface"])
    return m, b

# ── materials ────────────────────────────────────────────────
def mat_ring():
    m, b = base_mat("Ring")
    set_in(b, ["Base Color"], COPPER)
    set_in(b, ["Metallic"], 1.0)
    set_in(b, ["Roughness"], 0.34)   # satin. 0.20 is a mirror and mirrors
                                     # just hand you back a white panel.
    try:
        nt = m.node_tree
        w = nt.nodes.new("ShaderNodeTexWave"); w.wave_type='RINGS'
        set_in(w, ["Scale"], 40.0); set_in(w, ["Distortion"], 2.0)
        set_in(w, ["Detail"], 5.0)
        bp = nt.nodes.new("ShaderNodeBump")
        set_in(bp, ["Strength"], 0.05); set_in(bp, ["Distance"], 0.003)
        nt.links.new(w.outputs["Fac"], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
    except Exception as ex:
        notes.append(f"Ring tex : {ex}")
    return m

def mat_fire():
    """Voronoi = beaten/hammered metal. Noise made smoke, which was the bug."""
    m, b = base_mat("Flame")
    set_in(b, ["Base Color"], FIRE_COL)
    set_in(b, ["Metallic"], 1.0)
    set_in(b, ["Roughness"], 0.30)
    try:
        nt = m.node_tree
        v = nt.nodes.new("ShaderNodeTexVoronoi")
        try: v.feature = 'SMOOTH_F1'
        except Exception: pass
        set_in(v, ["Scale"], 34.0)
        set_in(v, ["Smoothness"], 0.85)
        set_in(v, ["Randomness"], 1.0)
        bp = nt.nodes.new("ShaderNodeBump")
        set_in(bp, ["Strength"], 0.85); set_in(bp, ["Distance"], 0.010)
        out = "Distance" if "Distance" in v.outputs else v.outputs[0].name
        nt.links.new(v.outputs[out], bp.inputs["Height"])
        nt.links.new(bp.outputs["Normal"], b.inputs["Normal"])
        notes.append("Fire tex : Voronoi hammered")
    except Exception as ex:
        notes.append(f"Fire tex : plain ({ex})")
    return m

def mat_poly(name, rough):
    m, b = base_mat(name)
    set_in(b, ["Base Color"], COPPER)
    set_in(b, ["Metallic"], 1.0)
    set_in(b, ["Roughness"], rough)
    return m

M_RING, M_FIRE = mat_ring(), mat_fire()
M_NUM, M_TXT   = mat_poly("Numeral", 0.10), mat_poly("Inscription", 0.28)

def boolean(target, cutter):
    md = target.modifiers.new("bool", 'BOOLEAN')
    md.operation = 'DIFFERENCE'; md.object = cutter
    if hasattr(md, "solver"):
        try: md.solver = 'EXACT'
        except Exception: pass
    activate(target)
    try: bpy.ops.object.modifier_apply(modifier=md.name)
    except Exception as ex: notes.append(f"bool: {ex}")
    bpy.data.objects.remove(cutter, do_unlink=True)

# ── RING ─────────────────────────────────────────────────────
bpy.ops.mesh.primitive_cylinder_add(radius=R_OUT, depth=RING_D,
                                    vertices=256, location=(0,0,0))
ring = bpy.context.object; ring.name = "Ring"
bpy.ops.mesh.primitive_cylinder_add(radius=R_IN, depth=RING_D*3,
                                    vertices=256, location=(0,0,0))
boolean(ring, bpy.context.object)

# grooves, with a gap cut where the inscription sits
gap_half = math.radians(TEXT_SPAN*0.72)
for gi, gr in enumerate(GROOVES):
    bpy.ops.mesh.primitive_torus_add(major_radius=gr, minor_radius=GROOVE_W,
                                     major_segments=224, minor_segments=10,
                                     location=(0,0,RING_D/2))
    cut = bpy.context.object
    if gi == 0:                                  # only the innermost breaks
        bpy.ops.mesh.primitive_cube_add(size=1.0,
            location=(0, -gr, RING_D/2))
        box = bpy.context.object
        box.scale = (gr*math.sin(gap_half)*2.0, 0.35, 0.35)
        boolean(cut, box)
    boolean(ring, cut)

bev = ring.modifiers.new("Bevel", 'BEVEL')
bev.width = 0.005; bev.segments = 3
bev.limit_method = 'ANGLE'; bev.angle_limit = math.radians(30)
if hasattr(bev, "harden_normals"): bev.harden_normals = True
ring.data.materials.append(M_RING)
smooth(ring, 30)

# ── FLAME ────────────────────────────────────────────────────
fire = None
try:
    cu = bpy.data.curves.new("FlameCurve", type='CURVE')
    cu.dimensions='2D'; cu.fill_mode='BOTH'
    cu.extrude=FLAME_D; cu.bevel_depth=0.007; cu.resolution_u=6
    sp = cu.splines.new('POLY'); sp.points.add(len(FLAME)-1)
    for i,(x,y) in enumerate(FLAME):
        sp.points[i].co = (x,y,0.0,1.0)
    sp.use_cyclic_u = True
    fire = bpy.data.objects.new("Flame", cu)
    bpy.context.collection.objects.link(fire)
    fire.data.materials.append(M_FIRE)
    fire.location = (0,0,0.005)
    fire.scale = (1.06, 1.06, 1.0)      # licks graze the ring opening
    notes.append(f"Flame    : {len(FLAME)} pts, touches the opening")
except Exception as ex:
    notes.append(f"Flame    : FAILED ({ex})")

# ── NUMERAL, big flat chamfer ────────────────────────────────
num = None
try:
    bpy.ops.object.text_add(location=(0,0,NUM_Z))
    num = bpy.context.object; num.name="Numeral"
    td = num.data
    td.body=GLYPH; td.align_x='CENTER'; td.align_y='CENTER'
    td.size=NUM_SIZE; td.extrude=NUM_D
    td.bevel_depth = NUM_BEVEL
    if hasattr(td,"bevel_resolution"): td.bevel_resolution = 0   # flat facets
    if hasattr(td,"offset"): td.offset = -NUM_BEVEL*0.55         # keeps a crest
    picked="default"
    for fp in FONT_CANDIDATES:
        if os.path.exists(fp):
            try: td.font=bpy.data.fonts.load(fp); picked=os.path.basename(fp); break
            except Exception: continue
    notes.append("Font     : "+picked)
    activate(num); bpy.ops.object.convert(target='MESH')
    num = bpy.context.object
    num.data.materials.append(M_NUM)
    smooth(num, 22)
except Exception as ex:
    notes.append(f"Numeral  : {ex}")

# ── INSCRIPTION, one letter at a time around an arc ──────────
insc = []
try:
    sfont = None
    for fp in SMALL_FONT:
        if os.path.exists(fp):
            try: sfont = bpy.data.fonts.load(fp); break
            except Exception: continue
    chars = list(INSCRIPT)
    n = len(chars)
    span = math.radians(TEXT_SPAN)
    for i,ch in enumerate(chars):
        if ch == ' ': continue
        t = (i-(n-1)/2)/max(n-1,1)
        ang = -math.pi/2 + t*span
        x, y = TEXT_R*math.cos(ang), TEXT_R*math.sin(ang)
        bpy.ops.object.text_add(location=(x, y, RING_D/2 - 0.002))
        o = bpy.context.object; o.name = f"I_{i}"
        o.data.body = ch
        o.data.align_x='CENTER'; o.data.align_y='CENTER'
        o.data.size = TEXT_SIZE; o.data.extrude = 0.004
        if sfont: o.data.font = sfont
        o.rotation_euler = (0, 0, ang + math.pi/2)
        activate(o); bpy.ops.object.convert(target='MESH')
        o = bpy.context.object
        o.data.materials.append(M_TXT)
        insc.append(o)
    notes.append(f"Inscript : '{INSCRIPT}' on arc, {len(insc)} glyphs")
except Exception as ex:
    notes.append(f"Inscript : {ex}")

# ── stand up + turntable ─────────────────────────────────────
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
pivot = bpy.context.object; pivot.name="Turntable"
bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0,0,0))
face = bpy.context.object; face.name="Facing"
face.rotation_euler=(math.radians(90),0,0); face.parent=pivot
for o in [ring, fire, num]+insc:
    if o is not None: o.parent = face

prev=None
try:
    prev = bpy.context.preferences.edit.keyframe_new_interpolation_type
    bpy.context.preferences.edit.keyframe_new_interpolation_type='LINEAR'
except Exception: pass
pivot.rotation_euler=(0,0,0); pivot.keyframe_insert("rotation_euler",frame=1)
pivot.rotation_euler=(0,0,math.radians(360)); pivot.keyframe_insert("rotation_euler",frame=FRAMES+1)
if prev is not None:
    try: bpy.context.preferences.edit.keyframe_new_interpolation_type=prev
    except Exception: pass
scene.frame_start=1; scene.frame_end=FRAMES

# ── SOFTBOX ENVIRONMENT ──────────────────────────────────────
# Metal is a mirror. Bare lights give white blobs; broad emissive panels
# give the sweeping highlights you see in real product shots. These are
# invisible to the camera and only show up in reflections.
def softbox(name, loc, size, strength, warm=1.0):
    bpy.ops.mesh.primitive_plane_add(size=size, location=loc)
    o = bpy.context.object; o.name = name
    d = Vector((0,0,0)) - Vector(loc)
    o.rotation_euler = d.to_track_quat('-Z','Y').to_euler()
    m = bpy.data.materials.new(name+"_e")
    if getattr(m,"node_tree",None) is None and hasattr(m,"use_nodes"):
        m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs[0].default_value = (1.0, 0.97*warm, 0.94*warm, 1)
    e.inputs[1].default_value = strength
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(e.outputs[0], out.inputs["Surface"])
    o.data.materials.append(m)
    for attr in ("visible_camera","visible_shadow","visible_diffuse"):
        if hasattr(o, attr):
            try: setattr(o, attr, attr != "visible_camera")
            except Exception: pass
    return o

# STRENGTHS MATTER MORE THAN ANYTHING ELSE HERE.
# A mirror reflecting a strength-5 white panel gives you back white in all
# three channels no matter what colour you painted it. 0.35x was the fix.
softbox("SB_key",   (-2.6, -3.4,  2.6), 7.0, 1.75)
softbox("SB_fill",  ( 3.4, -3.0,  0.2), 6.0, 0.63)
softbox("SB_top",   ( 0.0, -2.0,  4.0), 6.0, 0.91)
softbox("SB_under", ( 0.3, -2.4, -3.4), 5.0, 0.42, warm=0.92)

try:
    w = bpy.data.worlds.new("W"); scene.world = w
    if getattr(w,"node_tree",None) is None and hasattr(w,"use_nodes"):
        w.use_nodes = True
    nt = w.node_tree
    bg = next((n for n in nt.nodes if n.type=='BACKGROUND'), None)
    if HDRI_PATH and os.path.exists(HDRI_PATH):
        env = nt.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(HDRI_PATH)
        nt.links.new(env.outputs["Color"], bg.inputs["Color"])
        bg.inputs[1].default_value = 1.0
        notes.append("Env      : HDRI")
    elif bg:
        bg.inputs[0].default_value = (0.035,0.035,0.04,1)
        bg.inputs[1].default_value = 1.0
        notes.append("Env      : softboxes")
except Exception as ex:
    notes.append(f"World    : {ex}")

# ── camera ───────────────────────────────────────────────────
lift = math.radians(CAM_LIFT)
bpy.ops.object.camera_add(location=(0,-CAM_DIST*math.cos(lift), CAM_DIST*math.sin(lift)))
cam = bpy.context.object; cam.name="RenderCam"
d = Vector((0,0,0)) - cam.location
cam.rotation_euler = d.to_track_quat('-Z','Y').to_euler()
cam.data.lens = 80
scene.camera = cam

# ── render ───────────────────────────────────────────────────
scene.render.engine='CYCLES'
if hasattr(scene,"cycles"):
    scene.cycles.samples=SAMPLES
    if hasattr(scene.cycles,"use_denoising"): scene.cycles.use_denoising=True
scene.render.use_freestyle=False
scene.render.film_transparent=True
scene.render.resolution_x=RES; scene.render.resolution_y=RES
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.render.filepath=os.path.join(OUT_DIR,"badge_")

print("="*54)
for n in notes: print(n)
print("Output   :", OUT_DIR)
print("SCRIPT COMPLETED — F12")
print("="*54)
