/*
 * Copyright (c) 2016-present, Oculus, LLC
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import VRAudioBufferSource from './VRAudioBufferSource';
import AudioSampleLoader from './AudioSampleLoader';
import * as THREE from 'three';

const DEFAULT_GAIN = 1.0;
const DEFAULT_PANNING_MODEL = 'HRTF';
const DEFAULT_DISTANCE_MODEL = 'inverse';
const DEFAULT_CONE_INNER_ANGLE = 60;
const DEFAULT_CONE_OUTER_ANGLE = 120;
const DEFAULT_CONE_OUTER_GAIN = 0.25;

/**
 * The basic audio player
 */

export default function VRAudioComponent(vrAudioContext, audioConfig) {
  this._vrAudioContext = vrAudioContext;

  // create audio nodes
  this._gain = this._vrAudioContext.getWebAudioContext().createGain();
  this._panner = this._vrAudioContext.getWebAudioContext().createPanner();

  // parameters for nodes
  this._gain.gain.value = DEFAULT_GAIN;
  this._panner.panningModel = audioConfig.panningModel ? audioConfig.panningModel : DEFAULT_PANNING_MODEL;
  this._panner.distanceModel = audioConfig.distanceModel ? audioConfig.distanceModel : DEFAULT_DISTANCE_MODEL;
  this._panner.coneInnerAngle = audioConfig.coneInnerAngle ? audioConfig.coneInnerAngle : DEFAULT_CONE_INNER_ANGLE;
  this._panner.coneOuterAngle = audioConfig.coneOuterAngle ? audioConfig.coneOuterAngle : DEFAULT_CONE_OUTER_ANGLE;
  this._panner.coneOuterGain = audioConfig.coneOuterGain ? audioConfig.coneOuterGain : DEFAULT_CONE_OUTER_GAIN;

  this._position = new THREE.Vector3(0, 0, 0);
  this._rotation = new THREE.Euler(0, 0, 0, 'XYZ');
}

VRAudioComponent.prototype = Object.assign( Object.create( Object.prototype ), {
  constructor: VRAudioComponent,

  setAudio: function(audioDef) {
    const self = this;
    self._disconnectNodes();
    self._freeSource();
    self._setAudioDef(audioDef);
    return new Promise(
      function(resolve, reject){

        self._source = new VRAudioBufferSource(self._vrAudioContext);

        self._source.onMediaReady = self._onMediaReady.bind(self);
        self._source.onMediaEnded = self._onMediaEnded.bind(self);

        self._source.initializeAudio(self.audioDef.src).then(
          function(success){
            resolve()
          }
        ).catch(
          (error) => {
            reject()
          }
        );
      });


  },

  _setAudioDef: function(audioDef) {
    this.audioDef = {
      streamingType: audioDef.streamingType,
      src: audioDef.src
    };
  },

  _onMediaReady: function() {
    this.onMediaReady && this.onMediaReady();
  },

  _onMediaEnded: function() {
    this.onMediaEnded && this.onMediaEnded();
  },

  _connectNodes: function(){
    if (this._source) {
      const srcNode = this._source.getSourceNode();
      if (srcNode) {
        srcNode.connect(this._gain);
      }
    }
    this._gain.connect(this._panner);
    this._panner.connect(this._vrAudioContext.getWebAudioContext().destination);
  },

  _disconnectNodes: function() {
    this._gain.disconnect();
    this._panner.disconnect();
  },

  _freeSource: function() {
    if (this._source) {
      this._source.dispose();
      this._source = undefined;
    }
  },

  play: function() {
    if (this._source) {
      this._disconnectNodes();
      this._source.play();
      this._connectNodes();
    }
  },

  pause: function(){
    if (this._source){
      this._source.pause();
    }
  },
  stop: function() {
    if (this._source) {
      this._source.stop();
      this._disconnectNodes();
    }
  },

  dispose: function() {
    this._disconnectNodes();
    this._freeSource();
    this.onMediaReady = undefined;
    this.onMediaEnded = undefined;
  },

  isPlaying: function() {
    if(this._source){
      return this._source.isSoundPlaying();
    } else {
      return false;
    }
  }

});

Object.defineProperties( VRAudioComponent.prototype, {
  position: {
    enumerable: true,
    get: function () {
      return this._position;
    },
    set: function (value) {
      this._position.copy(value);
      this._panner.setPosition(this._position.x, this._position.y, this._position.z);
    }
  },
  rotation: {
    enumerable: true,
    get: function () {
      return this._rotation;
    },
    set: function (value) {
      this._rotation.copy(value);
      var front = new THREE.Vector3( 0, 0, -1 );
      front.applyEuler(this._rotation);
      this._panner.setOrientation(front.x, front.y, front.z);
    }
  },
  gain: {
    enumerable: true,
    get: function () {
      return this._gain.gain.value;
    },
    set: function (value) {
      this._gain.gain.value = value;
    }
  },
} );
