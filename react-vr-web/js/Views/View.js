/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * Defines RTCView "derived" from RTCBaseView.
 * Assigns 'this.view' to OVRUI.UIView(guiSys),
 * so basically this is a view with three.js support.
 * @class RCTView
 * @extends RCTBaseView
 */

import RCTBaseView from './BaseView';
import {merge, isPositive} from '../Utils/Utils';
import * as OVRUI from 'ovrui';

export default class RCTView extends RCTBaseView {
  /**
   * constructor: allocates the required resources and sets defaults
   */
  constructor(guiSys) {
    super();
    var self = this;
    this.view = new OVRUI.UIView(guiSys);
    this._borderRadius = null;
    this._borderTopLeftRadius = null;
    this._borderTopRightRadius = null;
    this._borderBottomLeftRadius = null;
    this._borderBottomRightRadius = null;
    this._borderRadiusDirty = false;

    Object.defineProperty(this.props, "pointerEvents", {
      set: function (value) {
        self.view.setPointerEvents(value);
      }});
    Object.defineProperty(this.props, "hitSlop", {
      set: function (value) {
        if (typeof value === 'number') {
          self.view.setHitSlop(value, value, value, value);
        } else {
          self.view.setHitSlop(value.left, value.top, value.right, value.bottom);
        }
      }});
    Object.defineProperty(this.props, "cursorVisibilitySlop", {
      set: function (value) {
        if (typeof value === 'number') {
          self.view.setCursorVisibilitySlop(value, value, value, value);
        } else {
          self.view.setCursorVisibilitySlop(value.left, value.top, value.right, value.bottom);
        }
      }});

    // as style is declared in the base class with properties defining of setters must be accomplished with Object.defineProperty
    Object.defineProperty(this.style, "backgroundColor", { set: function (value) { self.view.setBackgroundColor(value) } });
    Object.defineProperty(this.style, "opacity", { set: function (value) { self.view.setOpacity(value) } });
    Object.defineProperty(this.style, "borderWidth", {
      set: function (value) {
        self.view.setBorderWidth(value);
      },
    });
    Object.defineProperty(this.style, "borderColor", { set: function (value) { self.view.setBorderColor(value) } });
    Object.defineProperty(this.style, "borderRadius", { set: function (value) {
      self._borderRadius = value;
      self._borderRadiusDirty = true;
    } });
    Object.defineProperty(this.style, "borderTopLeftRadius", { set: function (value) {
      self._borderTopLeftRadius = value;
      self._borderRadiusDirty = true;
    } });
    Object.defineProperty(this.style, "borderTopRightRadius", { set: function (value) {
      self._borderTopRightRadius = value;
      self._borderRadiusDirty = true;
    } });
    Object.defineProperty(this.style, "borderBottomLeftRadius", { set: function (value) {
      self._borderBottomLeftRadius = value;
      self._borderRadiusDirty = true;
    } });
    Object.defineProperty(this.style, "borderBottomRightRadius", { set: function (value) {
      self._borderBottomRightRadius = value;
      self._borderRadiusDirty = true;
    } });
  }

  /**
   * Customised present layout so that the border settings can be updated
   */
  presentLayout() {
    super.presentLayout();
    if (this._borderRadiusDirty) {
      const borderRadius = isPositive(this._borderRadius) ? this._borderRadius : 0;
      this.view.setBorderRadius([
        isPositive(this._borderTopRightRadius) ? this._borderTopRightRadius : borderRadius,
        isPositive(this._borderTopLeftRadius) ? this._borderTopLeftRadius : borderRadius,
        isPositive(this._borderBottomLeftRadius) ? this._borderBottomLeftRadius : borderRadius,
        isPositive(this._borderBottomRightRadius) ? this._borderBottomRightRadius : borderRadius,
      ]);
      this._borderRadiusDirty = false;
    }
  }

  /**
   * Describes the properies representable by this view type and merges
   * with super type
   */
  static describe() {
    return merge(super.describe(), {
      NativeProps: {
        pointerEvents: 'string',
        hitSlop: 'number',
        cursorVisibilitySlop: 'number',
      }
    });
  }
}
