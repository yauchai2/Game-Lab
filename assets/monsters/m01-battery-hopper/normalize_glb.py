"""Preserve Blender geometry/animation bytes; fix its emission-only palette export.
The native Blender graph renders vertex colors correctly but exports them as
COLOR_1 with an emissive material. Standard glTF unlit consumers need COLOR_0.
"""
from pathlib import Path
import json, struct

def normalize(source, destination):
    data=Path(source).read_bytes()
    magic,version,length=struct.unpack_from('<4sII',data)
    assert magic==b'glTF' and version==2 and length==len(data)
    n,kind=struct.unpack_from('<II',data,12);assert kind==0x4e4f534a
    doc=json.loads(data[20:20+n])
    binary_length,binary_kind=struct.unpack_from('<II',data,20+n)
    assert binary_kind==0x004e4942
    binary=data[28+n:28+n+binary_length]
    for material in doc['materials']:
        material['pbrMetallicRoughness']={'baseColorFactor':[1,1,1,1],'metallicFactor':0,'roughnessFactor':1}
        material['doubleSided']=False
        material.pop('emissiveFactor',None)
        material.setdefault('extensions',{})['KHR_materials_unlit']={}
    doc.setdefault('extensionsUsed',[])
    if 'KHR_materials_unlit' not in doc['extensionsUsed']:doc['extensionsUsed'].append('KHR_materials_unlit')
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            attr=primitive['attributes']
            assert 'COLOR_1' in attr, 'Expected native Blender Palette attribute'
            attr['COLOR_0']=attr.pop('COLOR_1')
            # No image textures are used; avoid allocating an unused UV buffer.
            attr.pop('TEXCOORD_0',None)
    encoded=json.dumps(doc,separators=(',',':'),ensure_ascii=True).encode()
    encoded+=b' '*((-len(encoded))%4)
    binary+=b'\0'*((-len(binary))%4)
    body=struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
    Path(destination).write_bytes(struct.pack('<4sII',b'glTF',2,12+len(body))+body)
    return {'source':str(source),'destination':str(destination),'geometry_and_animation_binary_preserved':True,'unlit_extension':True,'palette_promoted_to_COLOR_0':True}

if __name__=='__main__':
    import sys
    print(json.dumps(normalize(sys.argv[1],sys.argv[2]),indent=2))
