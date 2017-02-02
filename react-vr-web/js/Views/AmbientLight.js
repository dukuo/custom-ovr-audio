/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * RCTAmbientLight: runtime implementation of the <AmbientLight >
 * https://threejs.org/docs/index.html#Reference/Lights/AmbientLight
 * @class RCTAmbientLight
 * @extends RCTBaseView
 */

import RCTBaseView from './BaseView';
import {merge} from '../Utils/Utils';
import * as OVRUI from 'ovrui';
import * as THREE from 'three';

export default class RCTAmbientLight extends RCTBaseView {
  /**
   * constructor: allocates the required resources and sets defaults
   */
  constructor(guiSys) {
    super();
    var self = this;
    // create the ambient light as a child of an empty UIView
    // this allows embedding in layouts
    var light = new THREE.AmbientLight();
    this.view = new OVRUI.UIView(guiSys);
    this.view.add(light);
      // In "physically correct" mode, the product of color * intensity is interpreted as luminous intensity measured in candela.
    Object.defineProperty(this.props, "intensity", {
      set: function (value) {
        light.intensity = value;
      }});
    // Color of the light.
    Object.defineProperty(this.style, "color", {
      set: function (value) {
        light.color.set(value);
      }});

    // defaults that match three.js
    this.props.intensity = 1;
  }

  /**
   * Describes the properies representable by this view type and merges
   * with super type
   */
  static describe() {
    return merge(super.describe(), {
      // declare the native props sent from react to runtime
      NativeProps: {
        intensity: 'number',
      }
    });
  }
}
