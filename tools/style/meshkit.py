"""M04 original Blender geometry; shared deterministic helpers adapted from Game-Lab M01 build_m01.py. No textures, lights or AO; discrete vertex face colors."""
import bpy, bmesh, math, json, hashlib, sys
from pathlib import Path
from mathutils import Vector

OUT=Path(__file__).resolve().parent
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.render.fps=24
scene.frame_start=0
scene.frame_end=48
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
scene.view_settings.exposure=0
scene.view_settings.gamma=1

def linear(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def color(h,tone=1):
    h=h.lstrip('#')
    return tuple(linear(max(0,min(1,int(h[i:i+2],16)/255*tone))) for i in (0,2,4))+(1,)

PALETTE={'blue':'#249BC1','ivory':'#F1E7C7','joint':'#303536','sole':'#34383A','orange':'#FF7A13','cone':'#363B3D','rim':'#242A2D','vent':'#183F50'}
material=bpy.data.materials.new('M04_Unlit_VertexPalette')
material.diffuse_color=color(PALETTE['blue'])
material.use_nodes=True
nodes=material.node_tree.nodes;nodes.clear()
output=nodes.new('ShaderNodeOutputMaterial')
emission=nodes.new('ShaderNodeEmission');emission.inputs['Strength'].default_value=1
vertex=nodes.new('ShaderNodeVertexColor');vertex.layer_name='Palette'
material.node_tree.links.new(vertex.outputs['Color'],emission.inputs['Color'])
material.node_tree.links.new(emission.outputs['Emission'],output.inputs['Surface'])

def paint(obj,key,custom=None):
    me=obj.data;me.update()
    if not me.materials:me.materials.append(material)
    attr=me.color_attributes.get('Palette') or me.color_attributes.new(name='Palette',type='FLOAT_COLOR',domain='CORNER')
    for poly in me.polygons:
        poly.use_smooth=False
        # Fixed flat face colors, not a light, AO, normal map, or baked texture.
        tone=1.0 if abs(poly.normal.z)>.95 else (.94 if abs(poly.normal.x)>.95 else (.98 if abs(poly.normal.y)>.95 else .88))
        face_key=key
        if custom:face_key,tone=custom(poly,face_key,tone)
        rgba=color(PALETTE[face_key],tone)
        for loop in poly.loop_indices:attr.data[loop].color=rgba
    me.color_attributes.active_color=attr
    return obj

def mesh(name,verts,faces):
    me=bpy.data.meshes.new(name+'_Mesh');me.from_pydata(verts,[],faces);me.update()
    ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob)
    bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
    return ob

def box(name,loc,size,key,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    ob=bpy.context.object;ob.name=name;ob.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=ob.modifiers.new('Broad_single_chamfer','BEVEL');mod.width=min(bevel,min(size)*.3);mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return paint(ob,key)

def loft(name,sections,outline,key,custom=None):
    verts=[];faces=[];n=len(outline)
    for z,rx,ry,cx,cy in sections:
        verts.extend((cx+x*rx,cy+y*ry,z) for x,y in outline)
    for j in range(len(sections)-1):
        for i in range(n):faces.append((j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i))
    faces.append(tuple(reversed(range(n))))
    faces.append(tuple((len(sections)-1)*n+i for i in range(n)))
    return paint(mesh(name,verts,faces),key,custom)


def cylinder(name,loc,radius,depth,key,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc,rotation=(math.pi/2,0,0))
    ob=bpy.context.object;ob.name=name
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    return paint(ob,key)

def beam(name,a,b,width,depth,key):
    a,b=Vector(a),Vector(b)
    ob=box(name,(a+b)/2,(width,depth,(b-a).length),key,.035)
    ob.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return ob

