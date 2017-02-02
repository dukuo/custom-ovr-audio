/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

import RCTBaseView from './BaseView';
import {merge} from '../Utils/Utils';
import * as OBJLoader from '../Loaders/WaveformOBJ/OBJLoader';
import * as OVRUI from 'ovrui';
import * as THREE from 'three';

function extractURL(resource) {
  if (typeof resource === 'string') {
    return resource;
  }
  if (typeof resource === 'object' && typeof resource.uri === 'string') {
    return resource.uri;
  }
  return null;
}

/**
 * RCTMesh: runtime implementation of the
 * <Mesh source={{mesh: '', texture: ''}}>
 * Loads an obj mesh with the same texture used for all materials
 * when using a single texture it is possible to tint the material
 * <Mesh source={{url: '', mesh: '', mtl: ''}}>
 * Loads an obj mesh alongside a mtl file
 * view responds to layout and transforms with pivot point the center
 * of the view
 * @class RCTMesh
 * @extends RCTBaseView
 */
export default class RCTMesh extends RCTBaseView {
  /**
   * constructor: allocates the required resources and sets defaults
   */
  constructor(guiSys) {
    super();
    var geometry = undefined;
    var material = new THREE.MeshBasicMaterial({
      wireframe: false,
      color: 'white',
      side: THREE.DoubleSide,
    });

    this.mesh = undefined;
    this.view = new OVRUI.UIView(guiSys);
    Object.defineProperty(this.props, 'source', {
      set: (value) => {
        const prevMTLKey = this._mtlCacheKey;
        const prevOBJKey = this._objCacheKey;
        this._mtlCacheKey = null;
        this._objCacheKey = null;
        // text for the url, mtl and mesh case
        if (value.mtl && value.mesh) {
          // first load the material definition
          const mtlURL = extractURL(value.mtl);
          const meshURL = extractURL(value.mesh);
          this._mtlCacheKey = mtlURL;
          this._objCacheKey = meshURL;
          OBJLoader.load(meshURL, mtlURL, !!value.lit).then((mesh) => {
            if (this.mesh) {
              this.view.remove(this.mesh);
            }
            this.view.add(mesh);
            this.mesh = mesh;
            if (prevOBJKey || prevMTLKey) {
              OBJLoader.removeReferences(prevOBJKey, prevMTLKey);
            }
          });
        } else if (value.texture && value.mesh) {
          // alternative load path, this is designed for UI interaction objects
          const textureURL = extractURL(value.texture);
          const meshURL = extractURL(value.mesh);
          const loader = new THREE.TextureLoader();
          this._objCacheKey = meshURL;
          material.map = loader.load(textureURL, (texture) => {
            texture.wrapS = THREE.ClampToEdgeWrapping;
            texture.wrapT = THREE.ClampToEdgeWrapping;
            texture.minFilter = THREE.LinearFilter;
          });
          OBJLoader.load(meshURL, material, !!value.lit).then((mesh) => {
            if (this.mesh) {
              this.view.remove(this.mesh);
            }
            this.view.add(mesh);
            this.mesh = mesh;
            if (prevOBJKey || prevMTLKey) {
              OBJLoader.removeReferences(prevOBJKey, prevMTLKey);
            }
          });
        }
      }});
    // setup a setter so that changes to the backgroundColor style alter the default material
    Object.defineProperty(this.style, 'backgroundColor', {
      set: (value) => {
        material.color.set(value);
      },
    });
  }

  dispose() {
    OBJLoader.removeReferences(this._objCacheKey, this._mtlCacheKey);
    super.dispose();
  }

  /**
   * Describes the properies representable by this view type and merges
   * with super type
   */
  static describe() {
    return merge(super.describe(), {
      // register the properties sent from react to runtime
      NativeProps: {
        source: 'object',
      }
    });
  }
}
