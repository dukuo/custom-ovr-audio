/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

import AndroidConstants from './Modules/AndroidConstants';
import AsyncLocalStorage from './Modules/AsyncLocalStorage';
import ExternalAssets from './Modules/ExternalAssets';
import History from './Modules/History';
import LinkingManager from './Modules/LinkingManager';
import Networking from './Modules/Networking';
import {RCTResourceManager} from './Utils/RCTResourceManager';
import {RCTInputControls} from './Utils/RCTInputControls';
import {RCTHeadModel} from './Utils/RCTHeadModel';
import RCTVideoModule from './Modules/RCTVideoModule';
import RCTAudioModule from './Modules/RCTAudioModule';
import Timing from './Modules/Timing';
import UIManager from './Modules/UIManager';
import WebSocketModule from './Modules/WebSocketModule';
import ReactVRConstants from './Modules/ReactVRConstants';
import RCTExceptionsManager from './Modules/RCTExceptionsManager';
import RCTSourceCode from './Modules/RCTSourceCode';
import * as OVRUI from 'ovrui';
import * as THREE from 'three';

const ROOT_VIEW_INCREMENT = 10;

/**
 * ReactNativeContext is the main object for communicating to and from the React bundle
 * The react bundle runs asynchronously in a webworker so that the main UI and render thread
 * of the browser is not interrupted by work within react.
 * On construction the context will start the WebWorker and register a callback for handling
 * the messages which are handled in the `frame` function
 * As the webworker runs asynchronously calls to and from react are latent and therefore will
 * not have a return value. JavaScript callbacks and addional messages should be used to handle
 * responses
 * Order of API use:
 * 1) Create the Context
 * 2) register any external modules through `registerModule`
 * 3) init the bundle, this causes the bundle to be loaded from the url provided but prior to
 *    that creates a json description of the regstered modules. This description - created by
 *    `describe` - determines the details of the protocol that is used to communicate with the
 *    webworker. It is important that both the modules and the registered views of UIManager
 *    provide the necessary detail, for modules the majority of the work is handled via
 *    Module.describe however for views any properties that need to be communicated are across
 *    the WebWorker need to be described in `NativeProps`. Note any properties starting in '_'
 *    will be determined to be hidden and any functions starting with '$' will be determined to be
 *    async/promise functions and take an extra two callback IDs to denote success and fail - eg
 *    LinkingModule: openURL
 * 4) createRootView
 *    A root view is the main view created by the runtime code, this will then cause a registerd
 *    module to be created with the necessary Props
 *    see `AppRegistry.registerComponent('main', () => Main);`
 *    The root view tag is returned and can be used to update the props for the root view or
 *    delete the view
 * 5) start of render loop
 * 6) call frame function on context
 *    `frame` must be called within a requestAnimationFrame callback this pumps the webworker and
 *    distributes the messages obtained from the bridge. This is also where the <Scene> transform
 *    is applied, if one is present (not to the camera directly but to a camera parent object that
 *    we create and manage here; if camera already has a parent we log a warning and do nothing).
 * 7) update root view as required
 *    Optionally and as required the props on the root view can be updated using the root tag
 *    obtained from `createRootView`
 * 8) destroyRootView
 *    the destruction of the root view causes the entire view hierarchy to be deleted
 * 9) shutdown
 *    Will release the resrouces associated with the context, once shutdown an init is no longer
 *    possible
 **/


/**
 * replaceHiddenAttributes is a callback function used by the JSON.stringify,
 * the purpose is to prevent the serialization of any key that starts in '_' as
 * these are denoted to be private to the class
 **/
function replaceHiddenAttributes(key,value) {
  if (key.charAt && key.charAt(0) === '_' ) {
    return undefined;
  } else {
    return value;
  }
}

/**
 * describe
 * Reflects the contents of a the class over to React code
 * this is used within init to create a contract between the runtime and React
 * as to which module corresponds to a specfic index
 * @param ctx - React Context
 **/
function describe(ctx) {
  var remoteModuleConfig = [];
  for (var m in ctx.modules) {
    const module = ctx.modules[m]._describe();
    if (__DEV__) {
      console.log(module);
    }
    remoteModuleConfig.push(module);
  }

  return remoteModuleConfig;
}


export class ReactNativeContext {
  /**
   * Construct a ReactNativeContext given the gui and url for the bridge
   * the construction registers the core modules used by most applications
   * new modules can be registered after this but prior to the init call
   * @param guiSys - instance of OVRUI.guiSys
   * @param bridgeURL - url of location of bridge
   */
  constructor(guiSys, bridgeURL, options = {}) {
    this.modules = [];
    this.currentRootTag = 1;
    this.worker = new Worker(bridgeURL);
    this.guiSys = guiSys;
    this.messages = [];
    this.isLowLatency = !!options.isLowLatency; // Whether this context should target 90fps
    this.enableHotReload = !!options.enableHotReload; // Whether this context should enable hot reload

    this.lastHit = null;
    this.lastHitType = OVRUI.GuiSysHitType.GAZE;

    this.UIManager = new UIManager(this, guiSys);
    this.Timing = new Timing(this);
    this.RCTResourceManager = new RCTResourceManager();
    this.RCTInputControls = new RCTInputControls(this, guiSys);
    this.HeadModel = new RCTHeadModel(this);
    this.VideoModule = new RCTVideoModule(this);
    this.AudioModule = new RCTAudioModule(this);
    this._moduleForTag = [];
    this._cameraParentFromTag = [];

    // register the core modules
    this.registerModule(this.UIManager);
    this.registerModule(new AndroidConstants(this));
    this.registerModule(new AsyncLocalStorage(this));
    this.registerModule(new History(this));
    this.registerModule(new Networking(this));
    this.registerModule(new LinkingManager(this));
    this.registerModule(this.Timing);
    this.registerModule(this.VideoModule);
    this.registerModule(this.AudioModule);
    this.registerModule(new WebSocketModule(this));
    this.registerModule(new ReactVRConstants());
    this.registerModule(new RCTExceptionsManager());
    this.registerModule(new RCTSourceCode());
    this.registerModule(new ExternalAssets(options.assetRoot));

    // Register event listener to Guisys
    guiSys.eventDispatcher.addEventListener('GuiSysEvent', this._onGuiSysEvent.bind(this));
    guiSys.eventDispatcher.addEventListener('UIViewEvent', this._onUIViewEvent.bind(this));

    // register the worker onmessage function
    // messages are not execute at point of recieving
    // but queue for later dispatch in the `frame` function
    (function(self) {
      self.worker.onmessage = function(e)
      {
        var msg = e.data;
        if (!msg || !msg.cmd) {
          return;
        }
        if (msg.cmd === 'exec') {
          var results = msg.results;
          if ( results && results.length ) {
            self.messages.push(results);
          }
        }
      }
    })(this);
  }

  /**
   * initialises the WebWorker with the bundle
   * @param bundle - url of the bundle
   */
  init(bundle) {
    this.worker.postMessage(
      JSON.stringify({cmd: 'moduleConfig', moduleConfig: {
        remoteModuleConfig: describe(this),
      }
    }, replaceHiddenAttributes) );

    this.worker.postMessage(JSON.stringify({cmd: 'bundle', bundleName: bundle }));
    if (this.enableHotReload) {
      const bundleURL = new URL(bundle);
      console.warn('HotReload on ' + bundle);
      this.callFunction(
        'HMRClient',
        'enable',
        [
          'vr',
          bundleURL.pathname.toString().substr(1),
          bundleURL.hostname,
          bundleURL.port
        ]);
    }
  }

  /**
   * shutdown the react native context
   */
  shutdown() {
    for (var m in this.modules) {
      this.modules[m].shutdown && this.modules[m].shutdown();
    }
  }

  /**
   * creates a root view given the registered modules and optional props
   * @param module - name of module registered in the react bundle
   * @param props - props that is posted to the registered module
   * @return returns the tag of the rootview
   */
  createRootView(module, props) {
    var tag = this.currentRootTag;
    this.currentRootTag += ROOT_VIEW_INCREMENT;
    this.worker.postMessage( JSON.stringify({
      cmd: 'exec',
      module: 'AppRegistry',
      function: 'runApplication',
      args: [module, {initialProps: props, rootTag: tag}],
      }));
    this._moduleForTag[tag] = module;
    this._cameraParentFromTag[tag] = new THREE.Object3D();
    this.UIManager.createRootView(tag);
    return tag;
  }

  /**
   * updated a root view with new props
   * @param tag - root view tag returned from createRootView
   * @param props - props that is posted to the registered module
   */
  updateRootView(tag, props) {
    this.worker.postMessage( JSON.stringify({
      cmd: 'exec',
      module: 'AppRegistry',
      function: 'runApplication',
      args: [this._moduleForTag[tag], {initialProps: props, rootTag: tag}],
      }));
  }

  /**
   * deletes the root view
   * @param tag - root view tag returned from createRootView
   */
  destroyRootView(tag) {
    delete this._moduleForTag[tag];
    var cameraParent = this._cameraParentFromTag[tag];
    if (cameraParent) {
      // Detach children; typically there is only 1 child, the camera.
      for (let child of cameraParent.children) {
        cameraParent.remove(child);
      }
      delete this._cameraParentFromTag[tag];
    }
    this.worker.postMessage( JSON.stringify({
      cmd: 'exec',
      module: 'AppRegistry',
      function: 'unmountApplicationComponentAtRootTag',
      args: [tag],
    }));
  }

  /**
   * internal function that processing the gui event and distributes to React code
   * @param even - event object passed from guiSys
   */
  _onGuiSysEvent(event) {
    switch(event.eventType) {
      case OVRUI.GuiSysEventType.HIT_CHANGED:
        if (this.lastHit !== event.args.currentHit || this.lastHitType !== event.args.currentHitType) {
          this.lastHit = event.args.currentHit;
          this.lastHitType = event.args.currentHitType;
        }
        break;
      default:
        break;
    }
  }

  /**
   * internal function that processing the uiview event and distributes to React code
   * @param even - event object passed from uiView
   */
  _onUIViewEvent(event) {
    switch(event.eventType) {
      case OVRUI.UIViewEventType.FOCUS_LOST:
        {
          let viewTag = event.view ? this.getHitTag(event.view) : undefined;
          let targetTag = event.args.target ? this.getHitTag(event.args.target) : undefined;
          if (viewTag) {
            // Dispatch gaze exit event
            if (event.args.hitType === OVRUI.GuiSysHitType.GAZE) {
              this.callFunction(
                'RCTEventEmitter',
                'receiveEvent',
                [viewTag, 'topGazeExit', [targetTag]]);
            }
            // Dispatch mouse exit event
            if (event.args.hitType === OVRUI.GuiSysHitType.MOUSE) {
              this.callFunction(
                'RCTEventEmitter',
                'receiveEvent',
                [viewTag, 'topMouseExit', [targetTag]]);
            }

            // Dispatch exit event for all exit event
            this.callFunction(
                'RCTEventEmitter',
                'receiveEvent',
                [viewTag, 'topExit', [targetTag]]);
          }
        }
        break;
      case OVRUI.UIViewEventType.FOCUS_GAINED:
        {
          let viewTag = event.view ? this.getHitTag(event.view) : undefined;
          let targetTag = event.args.target ? this.getHitTag(event.args.target) : undefined;
          if (viewTag) {
            // Dispatch gaze enter event
            if (event.args.hitType === OVRUI.GuiSysHitType.GAZE) {
              this.callFunction(
                'RCTEventEmitter',
                'receiveEvent',
                [viewTag, 'topGazeEnter', [targetTag]]);
            }
            // Dispatch mouse enter event
            if (event.args.hitType === OVRUI.GuiSysHitType.MOUSE) {
              this.callFunction(
                'RCTEventEmitter',
                'receiveEvent',
                [viewTag, 'topMouseEnter', [targetTag]]);
            }

            // Dispatch exit event for all exit event
            this.callFunction(
                'RCTEventEmitter',
                'receiveEvent',
                [viewTag, 'topEnter', [targetTag]]);
          }
        }
        break;
      default:
        break;
    }
  }

  /**
   * frame update, services the modules and views
   * must be called regularly to ensure the messages from the WebWorker are distributed
   * @param camera - three.js camera used to view the scene
   * @param rootTag - the React Tag for the root of the scene
   */
  frame(camera, rootTag) {
    const frameStart = window.performance ? performance.now() : Date.now();
    this.Timing && this.Timing.frame(frameStart);
    this.worker.postMessage( JSON.stringify({
      cmd: 'flush' }) );
    for (var index in this.messages) {
      var results = this.messages[index];
      if (results && results.length>=3) {
        var moduleIndex = results[0];
        var funcIndex = results[1];
        var params = results[2];
        for (var i=0; i<moduleIndex.length; i++)
        {
          this.modules[moduleIndex[i]]
            ._functionMap[funcIndex[i]]
              .apply(this.modules[moduleIndex[i]],params[i]);
        }
      }
    }

    this.messages = [];
    this.UIManager && this.UIManager.frame();
    this.HeadModel && this.HeadModel.frame(camera);
    this.VideoModule && this.VideoModule.frame();
    this.AudioModule && this.AudioModule.frame(camera);

    this._applySceneTransform(camera, rootTag);

    // Last, check if there is any remaining frame time, and use it to run idle
    // callbacks
    this.Timing && this.Timing.idle(frameStart);
  }

  /**
    * Updates the camera parent with current <Scene> transform, if any.
    * Do nothing if there is no <Scene>, the <Scene> has no transform property,
    * or the camera already has a parent object.
   **/
  _applySceneTransform(camera, rootTag) {
    var worldMatrix = this.UIManager.getSceneCameraTransform(rootTag);
    var cameraParent = this._cameraParentFromTag[rootTag];

    // worldMatrix is null if no <Scene> or <Scene> has no transform property.
    // We may have set cameraParentFromeTag[rootTag] to null (and printed a
    // console warning) if there was a <Scene> transform but the camera already
    // had a parent. Return immediately in both cases.
    if (!worldMatrix || !cameraParent) {
      return;
    }

    // Don't overwrite a parent object that isn't ours.
    if (camera.parent && camera.parent.uuid !== cameraParent.uuid) {
      console.warn('Camera object already has a parent; '+
        'Use of \'transform\' property on <Scene> will have no effect.');
      this._cameraParentFromTag[rootTag] = null;
      return;
    }

    // One-time initialization: parent the camera object under cameraParent.
    // We use a parent to avoid modifying the camera's local transform, which
    // is being updated with positional tracking data when available.
    if (cameraParent.children.length === 0) {
      cameraParent.add(camera);
    }

    // In Three.js, object.matrix and object.matrixWorld represent the local and
    // global transforms. When matrixAutoUpdate is enabled (which is the default)
    // both are recomputed each frame (in WebGLRenderer.render), matrix from the
    // object's position, rotation, and scale attributes and matrixWorld from the
    // parent hierarchy (if no parent, matrix and matrixWorld are identical).

    // We disable cameraParent.matrixAutoUpdate, since we update the matrix here
    // manually and we explicitely call updateMatrixWorld (which recomputes the
    // global transform of an object and its children).
    cameraParent.matrixAutoUpdate = false;
    cameraParent.matrix.fromArray(worldMatrix);
    cameraParent.updateMatrixWorld(true);
  }

  /**
    * getHitTag
    * @param hit - scene object
    * @returns the tag of the closest view with a tag or undefined if not found
   **/
  getHitTag(hit) {
    while (hit) {
      if (hit.tag) {
        return hit.tag;
      }
      hit = hit.parent;
    }
    return undefined;
  }

  /**
    * calls a particular function within a react module
    * @param moduleName - module within the react bundle
    * @param functionName - name of the function
    * @param args - array of args passed to react bundle over webworker
   **/
  callFunction(moduleName, functionName, args) {
    this.worker.postMessage( JSON.stringify({
      cmd: 'exec',
      module: moduleName,
      function: functionName,
      args: args})
    );
  }

  /**
    * calls a particular callback within a react module
    * @param id - callback specified by react
    * @param args - array of args passed to react bundle over webworker
   **/
  invokeCallback(id, args) {
    this.worker.postMessage( JSON.stringify({
      cmd: 'invoke',
      id: id,
      args: args})
    );
  }

  /**
    * registers a module for use by the context
    * must be specified prior to calling init
    * @param module - instance of a module to register, extends Module
   **/
  registerModule(module) {
    this.modules.push(module);
  }
}
