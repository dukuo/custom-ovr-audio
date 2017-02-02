/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * @class RCTVideoModule
 * @extends Module
 */

import Module from './Module';

export default class RCTVideoModule extends Module {
  constructor(rnctx) {
    super('RCTVideoModule');
    this._videoDefs = {};
    this._players = {};
    this._rnctx = rnctx;
  }

  /**
   * Add a new handle to the video module
   * @param {string} handle - The video handle.
   */
  addHandle(handle) {
    const player = new OVRVideo.VRVideoComponent();
    this._players[handle] = player;
    this._videoDefs[handle] = this._createVideoDef();
    player.onMediaReady = this._onMediaReady.bind(this, handle);
    player.onMediaEnded = this._onMediaEnded.bind(this, handle);
  }

  _createVideoDef() {
    return {
      stereoType: 'none',
      streamingType: 'none',
    };
  }

  _onMediaReady(handle) {
    // Emit video ready event to react
    this._rnctx.callFunction(
      'RCTDeviceEventEmitter',
      'emit',
      ['onVideoReady', handle]
    );
  }

  _onMediaEnded(handle) {
    // Emit video ended event to react
    this._rnctx.callFunction(
      'RCTDeviceEventEmitter',
      'emit',
      ['onVideoEnded', handle]
    );
  }

  /**
   * Set the video url
   * @param {string} handle - The video handle.
   */
  setUrl(handle, url) {
    this._videoDefs[handle].src = url;
    this._videoDefs[handle].streamingType = 'none';
  }

  /**
   * Set the mpd file url and proxy
   * @param {string} handle - The video handle.
   */
  setMpdUrl(handle, mpdUrl, proxy) {
    this._videoDefs[handle].mpdUrl = mpdUrl;
    this._videoDefs[handle].proxy = proxy;
    this._videoDefs[handle].streamingType = 'dash';
  }

  /**
   * load the video
   * @param {string} handle - The video handle.
   */
  load(handle) {
    this._players[handle].setVideo(this._videoDefs[handle]);

     // Add resource to mono texture
    const monoTextureInfo = {
      type: 'MonoTextureInfo',
      texture: this._players[handle].videoTextures[0],
    };
    this._rnctx.RCTResourceManager.addResource(
      'MonoTexture',
      handle,
      monoTextureInfo
    );

    // Add resource to stereo textures
    const stereoTextureInfo = {
      type: 'StereoTextureInfo',
      textures: this._players[handle].videoTextures,
      offsetRepeats: this._players[handle].offsetRepeats,
    };
    this._rnctx.RCTResourceManager.addResource(
      'StereoTextures',
      handle,
      stereoTextureInfo
    );
  }

  /**
   * play the video
   * @param {string} handle - The video handle.
   */
  play(handle) {
    this._players[handle].videoPlayer.play();
  }

  /**
   * pause the video
   * @param {string} handle - The video handle.
   */
  pause(handle) {
    this._players[handle].videoPlayer.pause();
  }

  /**
   * dispose the video
   * @param {string} handle - The video handle.
   */
  dispose(handle) {
    this._rnctx.RCTResourceManager.removeResource('MonoTexture', handle);
    this._rnctx.RCTResourceManager.removeResource('StereoTextures', handle);
    this._players[handle].dispose();
    delete this._players[handle];
    delete this._videoDefs[handle];
  }

  frame() {
    for (let key in this._players) {
      this._players[key].frame();
    }
  }
}
