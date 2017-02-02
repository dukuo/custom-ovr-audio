/*
 * Copyright (c) 2016-present, Oculus, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import * as THREE from 'three';

/**
 * The basic wraper of audio context in VR
 */

export default function VRAudioContext(audioContext) {
  var _LEGACY_WEBAUDIO = window.hasOwnProperty('webkitAudioContext') && !window.hasOwnProperty('AudioContext');
  if (_LEGACY_WEBAUDIO) {
    console.log('Outdated version of Web Audio API detected.');
  }

  this._context = _LEGACY_WEBAUDIO ? new webkitAudioContext() : new AudioContext();
}

VRAudioContext.prototype = Object.assign( Object.create( Object.prototype ), {
  constructor: VRAudioContext,

  getWebAudioContext: function() {
    return this._context;
  },

  frame: function(camera) {
    // console.log( camera.localToWorld(new THREE.Vector3(0, 0, 0)));
    const origin = camera.localToWorld(new THREE.Vector3(0, 0, 0));
    const front = camera.localToWorld(new THREE.Vector3(0, 0, -1)).sub(origin).normalize();
    const up = camera.localToWorld(new THREE.Vector3(0, 1, 0)).sub(origin).normalize();
    this._context.listener.setOrientation(
      front.x, front.y, front.z,
      up.x, up.y, up.z);
    this._context.listener.setPosition(origin.x, origin.y, origin.z);
  },

});
