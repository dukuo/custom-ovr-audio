/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * RCTPano: runtime implementation of the <Pano source={{uri:URL}}>
 * creates a 1000 m radius globe that as a child of the view
 * view responds to layout and transforms with pivot point the center
 * of the view
 * @class RCTPano
 * @extends RCTBaseView
 */

import RCTBaseView from './BaseView';
import {merge} from '../Utils/Utils';
import {HPanoBufferGeometry, HPANO_MAP_UNLOADED} from '../Utils/HPano';
import {RCTBindedResource} from '../Utils/RCTBindedResource';
import * as OVRUI from 'ovrui';
import * as THREE from 'three';

const panoRayCast = (function() {
  // avoid create temp objects;
  var inverseMatrix = new THREE.Matrix4();
  var ray = new THREE.Ray();
  var sphere = new THREE.Sphere(new THREE.Vector3(0,0,0), 1000);
  var intersectionPoint = new THREE.Vector3();
  var intersectionPointWorld = new THREE.Vector3();
  return function(raycaster, intersects) {
    // transform the ray into the space of the sphere
    inverseMatrix.getInverse( this.matrixWorld );
    ray.copy( raycaster.ray ).applyMatrix4( inverseMatrix );
    const intersect = ray.intersectSphere(sphere, intersectionPoint);
    if ( intersect === null ) return;

    // determine hit location in world space
    intersectionPointWorld.copy( intersectionPoint );
    intersectionPointWorld.applyMatrix4( this.matrixWorld );

    var distance = raycaster.ray.origin.distanceTo( intersectionPointWorld );
    if ( distance < raycaster.near || distance > raycaster.far ) return;

    intersects.push({
      distance: distance,
      point: intersectionPointWorld.clone(),
      object: this,
    });
  }
})();

export default class RCTPano extends RCTBaseView {
  /**
   * constructor: allocates the required resources and sets defaults
   */
  constructor(guiSys, rnctx) {
    super();
    var self = this;

    var geometry = new THREE.SphereGeometry( 1000, 50, 50 );
    var material = new THREE.MeshBasicMaterial({
      wireframe: false, color: 'white', side: THREE.DoubleSide });

    let globe = new THREE.Mesh(geometry, material);

    let onUpdate = function(scene, camera) {
      let projScreenMatrix = new THREE.Matrix4();
      let modelViewMatrix = new THREE.Matrix4();
      modelViewMatrix.multiplyMatrices(camera.matrixWorldInverse, globe.matrixWorld);
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, modelViewMatrix);
      globe.geometry.update(self.maxDepth, projScreenMatrix);
      globe.material = globe.geometry.material;
    }
    globe.raycast = panoRayCast.bind(globe);
    globe.rotation.y = -3.14159/2;

    this.view = new OVRUI.UIView(guiSys);
    this.view.add(globe);
    this._source = new RCTBindedResource(rnctx.RCTResourceManager);
    Object.defineProperty(this.props, "source", {
      set: function (value) {
        if (value.tile) {
          // use tile renderer
          globe.geometry.dispose();
          self.maxDepth = value.maxDepth || 2;
          globe.geometry = new HPanoBufferGeometry(
            1000,
            self.maxDepth,
            value.tile);
          globe.onUpdate = onUpdate;
        } else {
          // use sphere renderer
          globe.geometry.dispose();
          globe.geometry = geometry;
          globe.onUpdate = null;
          // call onLoadStart in React
          self.UIManager._rnctx.callFunction(
            'RCTEventEmitter',
            'receiveEvent',
            [self.getTag(), 'topLoadStart', []]);
          const defaultRequest = function(url, callback) {
            if (url == null) {
              // When a url is null or undefined, send undefined to callback
              callback(undefined)
            } else if (Array.isArray(url)) {
              let loader = new THREE.CubeTextureLoader();
              // When a load error occurs, send undefined to callback
              loader.load(url, callback, /* onProgress */undefined, /* onError */()=>callback(undefined));
            } else {
              // When a load error occurs, send undefined to callback
              let loader = new THREE.TextureLoader();
              loader.load(url, callback, /* onProgress */undefined, /* onError */()=>callback(undefined));
            }
          }
          const callback = function (texture) {
            globe.scale.x = -1;
            if ( texture === undefined ) {
              material.map = undefined;
              material.envMap = undefined;
            } else if (texture.type === 'MonoTextureInfo') {
              material.map = texture.texture;
              material.envMap = undefined;
            } else {
              let cubeTexture = texture.isCubeTexture ? texture : null;
              let flatTexture = texture.isCubeTexture ? null : texture;
              if (texture.isCubeTexture) {
                globe.scale.x = 1;
                texture.generateMipmaps = true;
              } else {
                texture.wrapS = THREE.ClampToEdgeWrapping;
                texture.wrapT = THREE.ClampToEdgeWrapping;
                texture.minFilter = THREE.LinearFilter;
              }
              material.map = flatTexture;
              material.envMap = cubeTexture;
            }
            material.needsUpdate = true;

            // call onLoad in React
            if (material.map) {
              self.UIManager._rnctx.callFunction(
                'RCTEventEmitter',
                'receiveEvent',
                [self.getTag(), 'topLoad', []]);
            }
            // call onLoadEvent in React
            self.UIManager._rnctx.callFunction(
              'RCTEventEmitter',
              'receiveEvent',
              [self.getTag(), 'topLoadEnd', []]);
          };

          self._source.request(value.uri, defaultRequest, callback);
        }
      }});
    // register a setter for the backgroundColor so the globe can be tinted
    Object.defineProperty(this.style, "backgroundColor", {
      set: function (value) {
        let opacity = parseInt(value.toString(16).slice(0,2), 16)/255.;
        material.color.set(value);
        material.opacity = opacity;
        material.transparent = (opacity < 1);
      }
    });
  }

  /**
   * Dispose of any associated resources
   */
  dispose() {
    if (this._source) {
      this._source.dispose();
    }
    super.dispose();
  }

  /**
   * Describes the properies representable by this view type and merges
   * with super type
   */
  static describe() {
    return merge(super.describe(), {
      // declare the native props sent from react to runtime
      NativeProps: {
        source: 'string',
      }
    });
  }
}
