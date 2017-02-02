/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * Defines RTCBaseView which maintains an array of children, style, and properties.
 * Provides methods to manage children and do layout, including presentLayout,
 * which essentially assigns position/rotation/frame).
 * @class RCTBaseView
 */

const INTERACTION_CALLBACKS = [
  'onEnter',
  'onExit',
  'onInput',
  'onGazeEnter',
  'onGazeExit',
  'onMouseEnter',
  'onMouseExit',
  'onChange',
  'onHeadPose',
  'onGazeInput',
  'onGazeHeadPose',
  'onMouseInput',
  'onMouseHeadPose',
  'onChangeCaptured',
  'onInputCaptured',
  'onHeadPoseCaptured',
  'onGazeInputCaptured',
  'onGazeHeadPoseCaptured',
  'onMouseInputCaptured',
  'onMouseHeadPoseCaptured'];

const IS_MOUSE_INTERACTION_CALLBACKS = {
  'onEnter': true,
  'onExit': true,
  'onInput': true,
  'onMouseEnter': true,
  'onMouseExit': true,
  'onChange': true,
  'onHeadPose': true,
  'onMouseInput': true,
  'onMouseHeadPose': true,
  'onChangeCaptured': true,
  'onInputCaptured': true,
  'onHeadPoseCaptured': true,
  'onMouseInputCaptured': true,
  'onMouseHeadPoseCaptured': true};

export default class RCTBaseView {
  /**
   * constructor: sets defaults for all views
   */
  constructor() {
    this.UIManager = null;
    this.tag = 0;
    this.rootTag = 0;
    this.children = [];
    this.parent = null;
    this.props = {};
    this.layout = {};
    this.style = {
      layoutOrigin: [0, 0],
    };
    this.interactableCount = 0;
    this.mouseInteractableCount = 0;
    this.isDirty = true;
    // renderGroup style property mapping to three.js view
    Object.defineProperty(this.style, "renderGroup", {
      set: (value) => {
        this.view && (this.view.renderGroup = value);
      }
    });
    let self = this;
    INTERACTION_CALLBACKS.forEach((element) => {
      Object.defineProperty(self.props, element.toString(), {
        set: (value) => {
          if (self.props['_'+element] != value) {
            self.interactableCount += (value) ? 1 : -1;
            if (IS_MOUSE_INTERACTION_CALLBACKS[element]) {
              self.mouseInteractableCount += (value) ? 1 : -1;
              self.view && self.view.setIsMouseInteractable(self.mouseInteractableCount>0);
            }
            self.view && self.view.setIsInteractable(self.interactableCount>0);
            self.view && self.view.forceRaycastTest(self.interactableCount>0);
            self.props['_'+element] = value;
          }
        }
      });
    });
    this.view = null;
  }

  /**
   * Returns react tag that this view is associated with
   */
  getTag() {
    return this.tag;
  }

  /**
   * Returns the index of child
   * @param child - child to find return -1 for not present
   */
  getIndexOf(child) {
    return this.children.indexOf(child);
  }

  /**
   * Returns the parent view
   */
  getParent() {
    return this.parent;
  }

  /**
   * Add a child view at a specific index
   * @param index - index to add at
   * @param child - view to add
   */
  addChild(index, child) {
    this.children.splice(index, 0, child);
    this.view.add(child.view);
  }

  /**
   * Sets the parent view
   * @param parent - view to set
   */
  setParent(parent) {
    this.parent = parent;
  }

  /**
   * Remove a child a specfic index
   * @param index - index within child to remove, will also child view
   *                from three.js scene
   */
  removeChild(index) {
    this.view.remove( this.children[index].view );
    this.children.splice(index,1);
  }

  /**
   * Returns the child at index
   * @param index - index within children Array to return
   */
  getChild(index) {
    return this.children[index];
  }

  /**
   * Returns the number of children attached to this view
   */
  getChildCount() {
    return this.children.length;
  }

  /**
   * Mark this view as dirty as well as parents, this will cause this view
   * to be relayed out
   */
  makeDirty() {
    let view = this;
    while (view) {
      view.isDirty = true;
      view = view.getParent();
    }
  }

  /**
   * dispose of any associated resource
   */
  dispose() {
    RCTBaseView.disposeThreeJSObject(this.view);
    this.view = null;
  }

  /**
   * Per Frame update for view
   */
  frame() {
    // TODO query why this isn't a setter
    if (this.style.opacity !== undefined) {
      this.view.setOpacity(this.style.opacity);
    }
  }

  /**
   * Given a layout object, calculate the associate transforms for three.js
   */
  presentLayout() {
    var x = this.layout.width ? -this.style.layoutOrigin[0] * this.layout.width : 0;
    var y = this.layout.height ? -this.style.layoutOrigin[1] * this.layout.height : 0;

    if (this.props.onLayout) {
      // send an event to the interested view which details
      // the layout location in the frame of the parent view
      // takes into account he layoutOrigin
      this.UIManager._rnctx.callFunction(
        'RCTEventEmitter',
        'receiveEvent',
        [this.getTag(), 'topLayout', {
          x: x+this.layout.left,
          y: y+this.layout.top,
          width: this.layout.width,
          height: this.layout.height,
        }]);
    }
    // it transform is set apply to UIView
    if (this.style.transform) {
      this.view.setLocalTransform && this.view.setLocalTransform(this.style.transform);
    }
    this.view.setFrame && this.view.setFrame(
      x+this.layout.left,
      -(y+this.layout.top),
      this.layout.width,
      this.layout.height,
      this.UIManager._layoutAnimation
      );
    this.view.owner = this;
  }

  /**
   * Helper to dispose of the internal memory allocations for three js object
   */
  static disposeThreeJSObject(node) {
    if (!node) {
      return;
    }
    if (node.geometry) {
      node.geometry.dispose();
      node.geometry = null;
    }

    if (node.material) {
      if (node.material.type === 'MultiMaterial') {
        for (let i in node.material.materials) {
          let mtr = node.material.materials[i];
          if (mtr.map) {
            mtr.map.dispose();
            mtr.map = null;
          }
          mtr.dispose();
        }
        node.material.materials = null;
      } else {
        if (node.material.map) {
          node.material.map.dispose();
          node.material.map = null;
        }
        node.material.dispose();
      }
    }
    for (let i in node.children) {
      RCTBaseView.disposeThreeJSObject(node.children[i]);
    }
    node.parent = null;
    node.children = null;
  }

  /**
   * Describe the props that are available for React to change
   */
  static describe() {
    return {
      NativeProps : {
        onLayout: 'function',
        onEnter: 'function',
        onExit: 'function',
        onInput: 'function',
        onGazeEnter: 'function',
        onGazeExit: 'function',
        onMouseEnter: 'function',
        onMouseExit: 'function',
        onChange: 'function',
        onInput: 'function',
        onHeadPose: 'function',
        onGazeInput: 'function',
        onGazeHeadPose: 'function',
        onMouseInput: 'function',
        onMouseHeadPose: 'function',
        onChangeCaptured: 'function',
        onInputCaptured: 'function',
        onHeadPoseCaptured: 'function',
        onGazeInputCaptured: 'function',
        onGazeHeadPoseCaptured: 'function',
        onMouseInputCaptured: 'function',
        onMouseHeadPoseCaptured: 'function',
      },
    };
  }
}
