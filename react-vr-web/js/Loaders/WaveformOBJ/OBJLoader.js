/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

import {readOBJFile} from './OBJParser';
import {readMTLFile} from './MTLParser';
import RefCountCache from '../../Utils/RefCountCache';
import * as THREE from 'three';

import type {MTLParserState, RawMTL, Texture} from './MTLParser';
import type {OBJParserState} from './OBJTypes';

// We currently use OBJLoader as a singleton, but we may want to create one
// per ReactNativeContext later on
const objStateCache: RefCountCache<OBJParserState> = new RefCountCache();
const mtlStateCache: RefCountCache<MTLParserState> = new RefCountCache();
const objLoaders: {[path: string]: Promise<OBJParserState>} = {};
const mtlLoaders: {[path: string]: Promise<MTLParserState>} = {};

// Mapping from the param name to Three's initialization property name
const MAP_TO_THREE_NAME = {
  bump: 'bumpMap',
  diffuse: 'map',
  displacement: 'displacementMap',
  emissive: 'emissiveMap',
  specular: 'specularMap',
};

/**
 * createMesh takes the intermediate state from the OBJParser, as well as
 * a mapping of material names to their parsed properties, and generates
 * THREE.Meshes with the appropriate materials.
 * If no material information is available, it applies a basic material.
 * If one material is provided, it is applied directly.
 * If multiple materials are provided, they are applied as a THREE.MultiMaterial
 * and the appropriate vector groups are created on the BufferedGeometry.
 * Each object geometry and is combined with its material to form a Mesh.
 * Each Mesh is then added to a single THREE.Group, returned by this method.
 */
function createMesh(
  state: OBJParserState,
  materialMap: {[name: string]: any},
  overrideMaterial: any
) {
  const group = new THREE.Group();
  state.objects.forEach((obj) => {
    const geometry = obj.geometry;
    if (geometry.position.length < 1) {
      return;
    }
    const materials = obj.materials
      // Eliminate materials that don't have any faces
      .filter(m => m.startGroup < m.endGroup || m.endGroup < 0)
      // Combine the material info with its start/end points
      .map(m => ({mat: materialMap[m.name], start: m.startGroup, end: m.endGroup}))
      // Eliminate unknown materials
      .filter(m => !!m.mat);
    const bufferGeometry = new THREE.BufferGeometry();
    bufferGeometry.addAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(geometry.position), 3)
    );
    bufferGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(geometry.index), 1));
    if (geometry.hasUVs) {
      bufferGeometry.addAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(geometry.uv), 2)
      );
    }
    if (geometry.hasNormals) {
      bufferGeometry.addAttribute(
        'normal',
        new THREE.BufferAttribute(new Float32Array(geometry.normal), 3)
      );
    } else {
      // Automatically compute vertex normals from face normals
      bufferGeometry.computeVertexNormals();
    }

    // Default basic material
    let material = overrideMaterial || new THREE.MeshBasicMaterial();
    if (!overrideMaterial) {
      if (materials.length === 1) {
        // Use the only material
        material = materials[0].mat;
      } else if (materials.length > 1) {
        // Construct a multi-material
        const multi = [];
        for (let i = 0; i < materials.length; i++) {
          let end = materials[i].end;
          if (end < 0) {
            end = geometry.index.length;
          }
          const length = end - materials[i].start;
          if (length > 0) {
            bufferGeometry.addGroup(
              materials[i].start,
              length,
              i
            );
            multi.push(materials[i].mat);
          }
        }
        material = new THREE.MultiMaterial(multi);
      }
    }
    material.shading = obj.smooth ? THREE.SmoothShading : THREE.FlatShading;
    const mesh = new THREE.Mesh(bufferGeometry, material);
    mesh.name = obj.name;
    group.add(mesh);
  });
  return group;
}

/**
 * addTextureMap loads an external texture file, generates a Three.js Texture
 * from it, and applies the appropriate parameters.
 */
function addTextureMap(
  directory: string,
  params: {[key: string]: any},
  type: string,
  tex: Texture
) {
  const mapParam = MAP_TO_THREE_NAME[type] || type;
  if (params[mapParam]) {
    // Use the first definition of each map type
    return;
  }
  // Load the file, relative to the directory of the MTL file.
  const path = directory + tex.file;
  const scale = new THREE.Vector2(tex.options.scale[0], tex.options.scale[1]);
  const offset = new THREE.Vector2(tex.options.origin[0], tex.options.origin[1]);
  if (type === 'bump') {
    if (tex.options.bumpMultiplier) {
      params.bumpScale = tex.options.bumpMultiplier;
    }
  }
  const loader = new THREE.TextureLoader(THREE.DefaultLoadingManager);
  loader.setCrossOrigin(true);
  const map = loader.load(path);
  map.name = tex.file;
  map.repeat.copy(scale);
  map.offset.copy(offset);
  if (tex.options.clamp) {
    map.wrapS = THREE.ClampToEdgeWrapping;
    map.wrapT = THREE.ClampToEdgeWrapping;
  } else {
    map.wrapS = THREE.RepeatWrapping;
    map.wrapT = THREE.RepeatWrapping;
  }
  params[mapParam] = map;
}

/**
 * createMaterial takes the intermediate parsed form of a material from a MTL
 * file and constructs a Three.js Material out of it.
 */
function createMaterial(url: string, raw: RawMTL, forceBasic: boolean = false) {
  const params: {[key: string]: any} = {
    name: raw.name,
  };
  const mtlDirectory = url.substr(0, url.lastIndexOf('/') + 1);
  if (raw.specular) {
    params.specular = new THREE.Color(raw.specular[0], raw.specular[1], raw.specular[2]);
  }
  if (raw.diffuse) {
    params.color = new THREE.Color(raw.diffuse[0], raw.diffuse[1], raw.diffuse[2]);
  }
  if (raw.emissive) {
    params.emissive = new THREE.Color(raw.emissive[0], raw.emissive[1], raw.emissive[2]);
  }
  if (raw.specularExp) {
    params.shininess = raw.specularExp;
  }
  if (raw.textureMap) {
    // Load each of the external texture images used by this material
    for (let type in raw.textureMap) {
      addTextureMap(mtlDirectory, params, type, raw.textureMap[type]);
    }
  }

  // If lighting is disabled, we use a Basic Material.
  // If lighting is enabled, the material is determined by the illumination
  // mode declared in the MTL file, defaulting to Phong is no mode is declared.
  const material = forceBasic ? new THREE.MeshBasicMaterial(params) :
    (raw.illum === 0 || raw.illum === 1 ? new THREE.MeshLambertMaterial(params) :
      new THREE.MeshPhongMaterial(params));
  if (raw.opacity && raw.opacity < 1.0) {
    material.transparent = true;
    material.opacity = raw.opacity;
  }
  material.url = url;
  return material;
}

export function fetchAndCacheOBJ(obj: string) {
  if (objStateCache.has(obj)) {
    objStateCache.addReference(obj);
    return Promise.resolve(objStateCache.get(obj));
  }

  // Make sure we only load + parse parallel OBJ requests once
  let objLoader = objLoaders[obj];
  if (!objLoader) {
    objLoader = fetch(obj).then(o => o.text()).then(text => readOBJFile(text));
    objLoaders[obj] = objLoader;
  }

  return objLoader.then((state) => {
    if (objStateCache.has(obj)) {
      objStateCache.addReference(obj);
    } else {
      objStateCache.addEntry(obj, state);
    }
    delete objLoaders[obj];
    return state;
  });
}

export function fetchAndCacheMTL(mtl: string) {
  if (mtlStateCache.has(mtl)) {
    mtlStateCache.addReference(mtl);
    return Promise.resolve(mtlStateCache.get(mtl));
  }

  // Make sure we only load + parse parallel MTL requests once
  let mtlLoader = mtlLoaders[mtl];
  if (!mtlLoader) {
    mtlLoader = fetch(mtl).then(m => m.text()).then(text => readMTLFile(text));
    mtlLoaders[mtl] = mtlLoader;
  }

  return mtlLoader.then((state) => {
    if (mtlStateCache.has(mtl)) {
      mtlStateCache.addReference(mtl);
    } else {
      mtlStateCache.addEntry(mtl, state);
    }
    delete mtlLoaders[mtl];
    return state;
  });
}

export function removeReferences(obj: ?string, mtl: ?string) {
  if (obj) {
    objStateCache.removeReference(obj);
  }
  if (mtl) {
    mtlStateCache.removeReference(mtl);
  }
}

/**
 * load is the public entrypoint for the loader. Given the paths to an OBJ file,
 * a material source, and an optional lighting flag, it loads the external
 * resources, constructs the relevant Three.js Meshes and Materials, and returns
 * a Promise resolved with a single THREE.Group when the parsing has completed.
 * The material source can either be the string path to a MTL file, or a
 * pre-constructed THREE.Material.
 */
export function load(
  obj: string,
  material: any,
  lit: boolean
): Promise<any> {
  if (!obj) {
    throw new Error('Cannot load an OBJ file without a filename');
  }
  if (typeof material === 'string') {
    // Fetch and parse the files in parallel
    return Promise.all([
      fetchAndCacheOBJ(obj),
      fetchAndCacheMTL(material),
    ]).then((results: [OBJParserState, MTLParserState]) => {
      const [objState, mtlState] = results;
      const materialMap: {[name: string]: any} = {};
      for (let m of mtlState) {
        if (m.name) {
          materialMap[m.name] = createMaterial(material, m, !lit);
        }
      }
      return createMesh(objState, materialMap);
    });
  } else if (material instanceof THREE.Material) {
    return (
      fetchAndCacheOBJ(obj)
      .then((objState: OBJParserState) => createMesh(objState, {}, material))
    );
  } else {
    throw new Error('Unsupported material type');
  }
}
