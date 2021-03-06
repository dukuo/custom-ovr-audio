/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * RCTPointLight: runtime implementation of the <PointLight >
 * https://threejs.org/docs/index.html#Reference/Lights/PointLight
 * @class RCTAmbientLight
 * @extends RCTBaseView
 */

import RCTBaseView from './BaseView';
import {merge} from '../Utils/Utils';
import * as OVRUI from 'ovrui';
import * as THREE from 'three';

export default class RCTPointLight extends RCTBaseView {
  /**
   * constructor: allocates the required resources and sets defaults
   */
  constructor(guiSys) {
    super();
    var self = this;
    var light = new THREE.PointLight();
    this.view = new OVRUI.UIView(guiSys);
    this.view.add(light);
      // In "physically correct" mode, the product of color * intensity is interpreted as luminous intensity measured in candela.
    Object.defineProperty(this.props, "intensity", {
        set: function (value) {
        light.intensity = value;
      }});
      // If non-zero, light will attenuate linearly from maximum intensity at light position down to zero at distance.
    Object.defineProperty(this.props, "distance", {
      set: function (value) {
        light.distance = value;
      }});
      // The amount the light dims along the distance of the light
      // In "physically correct" mode, decay = 2 leads to physically realistic light falloff.
    Object.defineProperty(this.props, "decay", {
      set: function (value) {
        light.decay = value;
      }});
    // Color of the light.
    Object.defineProperty(this.style, "color", {
      set: function (value) {
        light.color.set(value);
      }});

    // defaults that match three.js
    this.props.intensity = 1;
    this.props.distance = 0;
    this.props.decay = 1;
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
        distance: 'number',
        decay: 'number',
      }
    });
  }
}
