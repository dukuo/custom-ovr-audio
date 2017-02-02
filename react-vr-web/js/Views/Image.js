/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * RCTImage: runtime implementation of the <Image source={{uri:URL}}>
 * @class RCTImage
 * @extends RCTBaseView
 */

import RCTBaseView from './BaseView';
import {merge, isPositive} from '../Utils/Utils';
import * as OVRUI from 'ovrui';

export default class RCTImage extends RCTBaseView {
  /**
   * constructor: allocates the required resources and sets defaults
   */
  constructor(guiSys) {
    super();
    var self = this;
    this.view = new OVRUI.UIView(guiSys);

    // assign the property function mappings
    Object.defineProperty(this.props, "source", {
      set: function (value) {
        // call onLoadStart in React
        self.UIManager._rnctx.callFunction(
          'RCTEventEmitter',
          'receiveEvent',
          [self.getTag(), 'topLoadStart', []]);
        // only interested in the uri for the source
        self.view.setImage(value.uri, function(loaded, width, height) {
          // call onLoad in React
          if (loaded) {
            self.UIManager._rnctx.callFunction(
              'RCTEventEmitter',
              'receiveEvent',
              [self.getTag(), 'topLoad', {
                url: value.uri,
                source: value,
                width: width,
                height: height,
              }]);
          }
          // call onLoadEvent in React
          self.UIManager._rnctx.callFunction(
            'RCTEventEmitter',
            'receiveEvent',
            [self.getTag(), 'topLoadEnd', []]);
        });
      }});
    Object.defineProperty(this.props, "resizeMode", {
      set: function (value) {
        self.view.setResizeMode(value);
      }});
    Object.defineProperty(this.props, "inset", {
      set: function (value) {
        self.view.setInset(value)
      }});
    Object.defineProperty(this.props, "insetSize", {
      set: function (value) {
        self.view.setInsetSize(value)
      }});
    Object.defineProperty(this.props, "crop", {
      set: function (value) {
        self.view.setTextureCrop(value)
      }});
    Object.defineProperty(this.props, "pointerEvents", {
      set: function (value) {
        self.view.setPointerEvents(value);
      }});
    Object.defineProperty(this.props, "hitSlop", {
      set: function(value) {
        if (typeof value === 'number') {
          self.view.setHitSlop(value, value, value, value);
        } else {
          self.view.setHitSlop(value.left, value.top, value.right, value.bottom);
        }
      }});
    this.props.inset = [0.0,0.0,0.0,0.0];
    this.props.insetSize = [0.0,0.0,0.0,0.0];

    // assign the style property function mappings
    // setter for tintColor, this is applied as a tint to the image
    Object.defineProperty(this.style, "tintColor", { set: function (value) { self.view.setImageColor(value) } });
    Object.defineProperty(this.style, "backgroundColor", { set: function (value) { self.view.setBackgroundColor(value) } });
    Object.defineProperty(this.style, "borderWidth", {
      set: (value) => {
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
    	// declare the supported properties send from react to native
      NativeProps: {
        source : 'string',
        resizeMode: 'string',
        inset: 'number',
        insetSize: 'number',
        crop: 'number',
        pointerEvents: 'string',
        hitSlop: 'number',
      }
    });
  }
}
