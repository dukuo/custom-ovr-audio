/*
 * Copyright (c) 2016-present, Oculus, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

/**
 * The source using AudioBufferSourceNode
 */
 import AudioSampleLoader from './AudioSampleLoader';

export default function VRAudioBufferSource(vrAudioContext) {
  this._vrAudioContext = vrAudioContext;
  this.isPlaying = false;
  this.startedAt = 0;
  this.pausedAt = 0;
}

VRAudioBufferSource.prototype = Object.assign( Object.create( Object.prototype ), {
  constructor: VRAudioBufferSource,

  initializeAudio: function(url) {
    const self = this;
    const ctx = this._vrAudioContext.getWebAudioContext();
    return new Promise((resolve, reject) => {
      var loader = new AudioSampleLoader();
      loader.ctx = ctx;
      loader.src = url;
      loader.onload = () => {
        self._buffer = loader.response;
        self._onMediaReady();
      };
      loader.onerror = () => {
        console.log("AudioSampleLoader failed ");
      };
      loader.send();
      resolve();
    });
  },

  getSourceNode: function() {
    return this._sourceNode;
  },

  _onMediaReady: function() {
    this.onMediaReady && this.onMediaReady();
  },

  _onMediaEnded: function() {
    this.onMediaEnded && this.onMediaEnded();
  },

  play: function() {
    if(this._buffer){
      const ctx = this._vrAudioContext.getWebAudioContext();
      const offset = this.pausedAt;

      // Every time play a buffered audio, a new buffer source node need to be created
      this._sourceNode = ctx.createBufferSource();
      this._sourceNode.connect(ctx.destination);
      this._sourceNode.buffer = this._buffer;
      this._sourceNode.onended = this._onMediaEnded.bind(this);
      this._sourceNode.start(0, offset);

      this.startedAt = ctx.currentTime - offset;
      this.pausedAt = 0;
      this.isPlaying = true;
    }
  },

  isSoundPlaying: function(){
    return this.isPlaying;
  },

  pause: function() {
    const ctx = this._vrAudioContext.getWebAudioContext();
    var elapsed = ctx.currentTime - this.startedAt;
    this.stop();
    this.pausedAt = elapsed;
  },

  stop: function() {
    if (this._sourceNode) {
      this._sourceNode.disconnect();
      this._sourceNode.stop(0);
      this._sourceNode = undefined;
    }
    this.pausedAt = 0;
    this.startedAt = 0;
    this.isPlaying = false;
  },

  dispose: function() {
    this.stop();
    this.onMediaReady = undefined;
    this.onMediaEnded = undefined;
  },

  getDuration(){
    return this._sourceNode.buffer.duration;
  },
  getCurrentTime(){
    if(this.pausedAt) {
      return this.pausedAt;
    }
    if(this.startedAt){
      return this.startedAt;
    }
    return 0;
  },

});
