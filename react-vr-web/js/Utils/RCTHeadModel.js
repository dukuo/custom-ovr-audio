/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

import * as OVRUI from 'ovrui';
import * as THREE from 'three';

/**
 * Class managing Head Model for ReactVR.
 * @constructor
 * @param {ReactNativeContext} rnctx - React Native Context
 */
export function RCTHeadModel(rnctx) {
  this._rnctx = rnctx;
}

RCTHeadModel.prototype = Object.assign( Object.create( Object.prototype ), {
  constructor: RCTHeadModel,

  sendHeadModel: function(camera) {
    // Send head(center eye) pose information
    // TODO: send left/right eye pose information
    camera.updateMatrixWorld(true);
    // This is the transform from camera to world
    const headMatrix = camera.matrixWorld;
    // This is the transform from world to camera
    const viewMatrix = new THREE.Matrix4();
    viewMatrix.getInverse(headMatrix);

    const headMatrixArray = headMatrix.toArray();
    const viewMatrixArray = viewMatrix.toArray();

    const target = this._rnctx.lastHit ?
      this._rnctx.getHitTag(this._rnctx.lastHit) :
      null;
    if (target) {
      // Dispatch head pose to gaze hit view
      if (this._rnctx.lastHitType === OVRUI.GuiSysHitType.GAZE) {
        this._rnctx.callFunction(
          'RCTEventEmitter',
          'receiveEvent',
          [target, 'topGazeHeadPose', {
            headMatrix: headMatrixArray,
            viewMatrix: viewMatrixArray,
            target: target
          }]
        );
      }
      // Dispatch head pose to mouse hit view
      if (this._rnctx.lastHitType === OVRUI.GuiSysHitType.MOUSE) {
        this._rnctx.callFunction(
          'RCTEventEmitter',
          'receiveEvent',
          [target, 'topMouseHeadPose', {
            headMatrix: headMatrixArray,
            viewMatrix: viewMatrixArray,
            target: target
          }]
        );
      }

      // Dispatch head pose to all hit view
      this._rnctx.callFunction(
          'RCTEventEmitter',
          'receiveEvent',
          [target, 'topHeadPose', {
            headMatrix: headMatrixArray,
            viewMatrix: viewMatrixArray,
            target: target
          }]
        );
    }

    // Dispatch event to registered callbacks
    this._rnctx.callFunction(
      'RCTDeviceEventEmitter',
      'emit',
      ['onReceivedHeadMatrix', headMatrixArray, viewMatrixArray]);
  },

  frame: function(camera) {
    this.sendHeadModel(camera);
  },
});
