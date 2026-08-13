"""
Rotating capsule — flat copper half, flat pitch-black half, white outline.
No lights, no shading, no glint, transparent background.

Blender 5.1. Scripting tab -> Run Script -> F12 for one frame,
Ctrl+F12 for the full 120-frame turn.
The viewport shows a grey cylinder. Only the RENDER is real.
"""

import bpy, math, os
from mathutils import Vector

# ─────────────────────────────────────────────────────────────
OUT_DIR    = r"C:\Users\deeka\Desktop\capsule_frames"
RES        = 1024
FRAMES     = 120        # length of one full turn

RADIUS     = 0.5
BODY_LEN   = 1.7
TILT_DEG   = 14

COPPER     = (0.722, 0.451, 0.200)    # #B87333
BLACK      = (0.0, 0.0, 0.0)
LINE_COLOR = (1.0, 1.0, 1.0)          # white outline
LINE_PX    = 3.0
# ─────────────────────────────────────────────────────────────

scene = bpy.context.scene
notes = []

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for block in (bpy.data.meshes, bpy.data.materials, bpy.data.objects,
              bpy.data.lights, bpy.data.cameras, bpy.data.curves):
    for item in list(block):
        if item.users == 0:
            block.remove(item)

# flat colour — no tone mapping
try:
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0
    notes.append("View     : Standard")
except Exception as ex:
    notes.append(f"View     : {ex}")

# ── capsule ──────────────────────────────────────────────────
bpy.ops.mesh.primitive_uv_sphere_add(radius=RADIUS, segments=64, ring_count=32)
cap = bpy.context.object
cap.name = "Capsule"
me = cap.data

half = BODY_LEN / 2.0
for v in me.vertices:
    if   v.co.z >  1e-6: v.co.z += half
    elif v.co.z < -1e-6: v.co.z -= half

bpy.ops.object.shade_smooth()

def set_in(node, names, value):
    for n in names:
        if n in node.inputs:
            node.inputs[n].default_value = value
            return True
    return False

def make_flat(name, rgb):
    mat = bpy.data.materials.new(name)
    if getattr(mat, "node_tree", None) is None and hasattr(mat, "use_nodes"):
        mat.use_nodes = True
    bsdf = next((n for n in mat.node_tree.nodes
                 if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is None:
        bsdf = mat.node_tree.nodes.new("ShaderNodeBsdfPrincipled")
        out = next((n for n in mat.node_tree.nodes
                    if n.type == 'OUTPUT_MATERIAL'), None) \
              or mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
        mat.node_tree.links.new(bsdf.outputs[0], out.inputs["Surface"])
    set_in(bsdf, ["Emission Color", "Emission"], (*rgb, 1.0))
    set_in(bsdf, ["Emission Strength"], 1.0)
    set_in(bsdf, ["Base Color"], (0, 0, 0, 1))
    set_in(bsdf, ["Metallic"], 0.0)
    set_in(bsdf, ["Roughness"], 1.0)
    set_in(bsdf, ["Specular IOR Level", "Specular"], 0.0)
    set_in(bsdf, ["Coat Weight"], 0.0)
    set_in(bsdf, ["Sheen Weight"], 0.0)
    return mat

me.materials.append(make_flat("CapCopper", COPPER))   # 0
me.materials.append(make_flat("CapBlack",  BLACK))    # 1

for poly in me.polygons:
    poly.material_index = 0 if poly.center.z > 0 else 1

def mark_seam(mesh):
    idx = [i for i, e in enumerate(mesh.edges)
           if abs(mesh.vertices[e.vertices[0]].co.z) < 1e-6
           and abs(mesh.vertices[e.vertices[1]].co.z) < 1e-6]
    if not idx:
        return "none"
    try:
        for i in idx:
            mesh.edges[i].use_freestyle_mark = True
        return f"{len(idx)} (legacy)"
    except AttributeError:
        pass
    try:
        attr = mesh.attributes.get(".freestyle_edge") or \
               mesh.attributes.new(".freestyle_edge", 'BOOLEAN', 'EDGE')
        for i in idx:
            attr.data[i].value = True
        return f"{len(idx)} (attribute)"
    except Exception as ex:
        return f"skipped ({ex})"

notes.append("Seam     : " + mark_seam(me))

cap.rotation_euler = (0.0, math.radians(90), 0.0)
bpy.ops.object.transform_apply(rotation=True)
cap.rotation_euler = (0.0, math.radians(TILT_DEG), 0.0)

# ── turntable ────────────────────────────────────────────────
prev = None
try:
    prev = bpy.context.preferences.edit.keyframe_new_interpolation_type
    bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'
except Exception:
    pass

bpy.ops.object.empty_add(type='PLAIN_AXES', location=(0, 0, 0))
pivot = bpy.context.object
pivot.name = "Turntable"
cap.parent = pivot

pivot.rotation_euler = (0, 0, 0)
pivot.keyframe_insert("rotation_euler", frame=1)
pivot.rotation_euler = (0, 0, math.radians(360))
pivot.keyframe_insert("rotation_euler", frame=FRAMES + 1)

if prev is not None:
    try:
        bpy.context.preferences.edit.keyframe_new_interpolation_type = prev
    except Exception:
        pass

scene.frame_start = 1
scene.frame_end   = FRAMES

# ── camera. no lights, emission needs none. ──────────────────
bpy.ops.object.camera_add(location=(0, -6.5, 1.5))
camera = bpy.context.object
camera.name = "RenderCam"
d = Vector((0, 0, 0)) - camera.location
camera.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
camera.data.lens = 90
scene.camera = camera

# ── render ───────────────────────────────────────────────────
scene.render.engine = 'CYCLES'
if hasattr(scene, "cycles"):
    scene.cycles.samples = 16
scene.render.film_transparent = True
scene.render.resolution_x = RES
scene.render.resolution_y = RES
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.filepath = os.path.join(OUT_DIR, "frame_")

# ── Freestyle white outline ──────────────────────────────────
scene.render.use_freestyle = True
scene.render.line_thickness_mode = 'ABSOLUTE'
scene.render.line_thickness = LINE_PX

vl = bpy.context.view_layer
vl.use_freestyle = True
fs = vl.freestyle_settings
while fs.linesets:
    fs.linesets.remove(fs.linesets[0])
ls = fs.linesets.new("Outline")
for attr in ("select_silhouette", "select_border", "select_crease",
             "select_edge_mark", "select_contour", "select_material_boundary"):
    if hasattr(ls, attr):
        setattr(ls, attr, True)
ls.linestyle.color     = LINE_COLOR
ls.linestyle.thickness = LINE_PX

print("=" * 54)
for n in notes:
    print(n)
print("Lights   :", [o.name for o in scene.objects if o.type == 'LIGHT'] or "none")
print("Objects  :", [o.name for o in scene.objects])
print("Output   :", OUT_DIR)
print("SCRIPT COMPLETED — press F12")
print("=" * 54)
