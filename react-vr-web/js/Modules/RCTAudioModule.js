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

import {VRAudioContext, VRAudioComponent} from 'ovr-audio';
import Module from './Module';

import * as THREE from 'three';

import type {ReactNativeContext} from '../ReactNativeContext';
import type {AudioConfig, AudioDef} from 'ovr-audio';

/**
 * @class RCTAudioModule
 * @extends Module
 */
export default class RCTAudioModule extends Module {

  audioContext: VRAudioContext;
  _audioDefs: {[handle: string]: AudioDef};
  _components: {[handle: string]: VRAudioComponent};
  _rnctx: ReactNativeContext;

  constructor(rnctx: ReactNativeContext) {
    super('RCTAudioModule');
    this.audioContext = new VRAudioContext();
    this._audioDefs = {};
    this._components = {};
    this._rnctx = rnctx;


  }

  /**
   * Add a new handle to the audio module
   * @param {string} handle - The audio handle.
   */
  addHandle(handle: string, audioConfig: AudioConfig) {
    const component = new VRAudioComponent(this.audioContext, audioConfig);
    this._components[handle] = component;
    this._audioDefs[handle] = this._createAudioDef();
    component.onMediaReady = this._onMediaReady.bind(this, handle);
    component.onMediaEnded = this._onMediaEnded.bind(this, handle);
  }

  _createAudioDef(): AudioDef {
    return {
      streamingType: 'buffer',
    };
  }

  _onMediaReady(handle: string) {
    // Emit audio ready event to react
    this._rnctx.callFunction(
      'RCTDeviceEventEmitter',
      'emit',
      ['onAudioReady', handle]);
  }

  _onMediaEnded(handle: string) {
    // Emit audio ended event to react
    this._rnctx.callFunction(
      'RCTDeviceEventEmitter',
      'emit',
      ['onAudioEnded', handle]);
  }
  
  _handleLoad(handle){
    return new Promise((resolve, reject) => {
       this._components[handle].setAudio(this._audioDefs[handle]).then(
         function(success){
           resolve()
         }
       )
       .catch(
         function(){
           reject();
         }
       );
    });
  }

  /**
   * Set the audio url
   * @param {string} handle - The audio handle.
   */
  setUrl(handle: string, url: string) {
    this._audioDefs[handle].src = url;
  }

  /**
   * load the audio
   * @param {string} handle - The audio handle.
   */
  load(handle: string) {
    this._handleLoad(handle);
  }

  /**
   * check if handle is currently playing
   * TODO: check why is throwing undefined when using AudioModule.isPlaying(handle)
   * @param {string} handle - The audio handle.
   */
  isPlaying(handle:string){
    return this._components[handle].isPlaying();
  }

  /**
   * play the audio
   * @param {string} handle - The audio handle.
   */
  play(handle: string) {
    this._components[handle].play();
  }

  /**
  * pause the audio
  *@param {strnig} handle - The sound handle
  */
  pause(handle: string){
    this._components[handle].pause();
  }

  /**
   * stop the audio
   * @param {string} handle - The audio handle.
   */
  stop(handle: string) {
    this._components[handle].stop();
  }

  /**
   * dispose the audio
   * @param {string} handle - The audio handle.
   */
  dispose(handle: string) {
    this._components[handle].dispose();
    delete this._components[handle];
    delete this._audioDefs[handle];
  }

  frame(camera: any) {
    this.audioContext.frame(camera);
  }
}
