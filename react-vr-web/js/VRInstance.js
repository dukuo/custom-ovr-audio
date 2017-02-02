/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

import {Scene} from 'three';
import {Player, GuiSys} from 'ovrui';
import bundleFromRoot from './bundleFromRoot';
import createRootView from './createRootView';

/**
 * VRInstance represents a mounted React VR application.
 * It contains such core pieces as an OVRUI player, a Three.js scene and camera,
 * and a React VR context used to execute a React application.
 */
export default class VRInstance {
  /**
   * Construct a VRInstance with a specific React VR application.
   * @param bundle - The relative or absolute path to the JS bundle containing
   *   the application
   * @param root - The name of the root component to render, as registered with
   *   AppRegistry from the React side.
   * @param parent (optional) - The element which will contain the VR window.
   *   It can be a DOM node, or the string id of a DOM node. If no parent is
   *   specified, the VR window will be directly attached to the body tag.
   * @param options (optional) - Extra options to configure the VRInstance.
   *   - cursorVisibility: sets when the gaze cursor is shown. default=hidden
   *   - height: a number specifying the height of the VR window, in pixels
   *   - nativeModules: array of native module instances to register
   *   - scene: the Three.js scene to which ReactVR elements are added
   *   - width: a number specifying the width of the VR window, in pixels
   */
  constructor(bundle, root, parent, options = {}) {
    if (!bundle) {
      throw new Error('Cannot initialize ReactVR without specifying a bundle');
    }
    if (!root) {
      throw new Error(
        'Cannot initialize ReactVR without specifying the root component'
      );
    }

    // Initialize the scene that will hold our contents
    this.scene = options.scene || new Scene();

    this.camera = options.camera || null;

    // Initialize a Player container, and attach it to the parent element
    this.player = new Player({
      elementOrId: parent,
      width: options.width,
      height: options.height,
      camera: this.camera,
    });

    let defaultAssetRoot = 'static_assets/';
    if (__DEV__) {
      defaultAssetRoot = '../static_assets/';
    }
    let assetRoot = options.assetRoot || defaultAssetRoot;
    if (!assetRoot.endsWith('/')) {
      assetRoot += '/';
    }

    // Initialize a GuiSys to use with React
    let guiOptions = {
      cursorVisibility: options.hasOwnProperty('cursorVisibility')
        ? options.cursorVisibility : 'hidden',
    };
    // console.log(this.player.hasOwnProperty('audioListener') ? this.player.audioListener : null);
    this.guiSys = new GuiSys(this.scene, guiOptions);
    this.rootView = createRootView(
      this.guiSys,
      root, // Name of the mounted root module, from AppRegistry
      {
        assetRoot: assetRoot,
        bundle: bundleFromRoot(bundle),
        nativeModules: options.nativeModules,
        isLowLatency: !this.player.isMobile,
        enableHotReload: options.enableHotReload,
        // audioListener: (this.player.hasOwnProperty('audioListener') ? this.player.audioListener : 'wat'),
      }
    );

    this._frame = this._frame.bind(this);
  }

  /**
   * Runs once per frame, to update each of the various components of this
   * VR application.
   * @param timestamp - current time in milliseconds; passed by the browser as
   *   the argument to the requestAnimationFrame callback
   */
  _frame(timestamp) {
    // Run custom render method
    if (typeof this.render === 'function') {
      this.render(timestamp);
    }
    const camera = this.player.camera;
    this.player.frame();
    // Get updates from GuiSys
    this.guiSys.frame(camera, this.player.renderer);
    // Get updates from RN
    this.rootView.frame(camera);
    // Render frame to output device
    this.player.render(this.scene);

    if (this._looping) {
      this.player.requestAnimationFrame(this._frame);
    }
  }

  /**
   * Start rendering the application
   */
  start() {
    this._looping = true;
    this.player.requestAnimationFrame(this._frame);
  }

  /**
   * Stop rendering the application
   */
  stop() {
    this._looping = false;
  }
}
