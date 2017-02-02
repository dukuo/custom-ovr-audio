/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * RCTText applies text, textColor, etc. attributes to view inside of updateView.
 * Includes properties such as fontSize, hAlign, etc.
 * @class RCTText
 * @extends RCTBaseView
 */

import RCTBaseView from './BaseView';
import {merge} from '../Utils/Utils';
import computeLayout from '../Utils/css-layout';
import * as OVRUI from 'ovrui';

// Mappings from react definitions to OVRUI
const ALIGN_MAP = {
  'auto': 'left',
  'left': 'left',
  'right': 'right',
  'center': 'center_line',
  'justify':  'left',
};

const ALIGN_VERTICAL_MAP = {
  'auto': 'top',
  'top': 'top',
  'bottom': 'bottom',
  'center': 'center',
};

const NAMED_FONT_WEIGHT = {
  'normal' : 200,
  'bold' : 600,
};

export default class RCTText extends RCTBaseView {
  /**
   * constructor: allocates the required resources and sets defaults
   */
  constructor(guiSys) {
    super();
    var self = this;
    this.view = new OVRUI.UIView(guiSys);
    this.guiSys = guiSys;
    this.isTextNode = true;
    this._textDirty = true;
    this._visualTextDirty = true;
    this.textChildren = [];

    // make use of getters and setters to directly apply the values to view when they change
    Object.defineProperty(this.props, "numberOfLines", {
      set: function (value) {
        self.props._numberOfLines = value;
        self._textDirty = true;
        self.makeDirty();
      }});
    Object.defineProperty(this.props, "hitSlop", {
      set: function (value) {
        if (typeof value === 'number') {
          self.view.setHitSlop(value, value, value, value);
        } else {
          self.view.setHitSlop(value.left, value.top, value.right, value.bottom);
        }
      }});

    // setup the setters from React parameters to internal state
    Object.defineProperty(this.style, "color", {
      set: function (value) {
        self.style._textColor = value;
        self.makeDirty();
      }});
    Object.defineProperty(this.style, "backgroundColor", {
      set: function (value) {
        self.view.setBackgroundColor(value);
      }});
    Object.defineProperty(this.style, "fontSize", {
      set: function (value) {
        self.view.setTextSize(value);
        self._fontSize = value;
        self._textDirty = true;
        self.makeDirty();
      },
      get: function () {
        return self._fontSize;
      }});
    // Map the fontWeight attribute into the SDF font parameters
    Object.defineProperty(this.style, "fontWeight", {
      set: function (value) {
        // lookup font weight if is named (eg normal or bold)
        let namedWeight = NAMED_FONT_WEIGHT[value];
        let intValue = parseInt(namedWeight ? namedWeight : value);
        // leave a constant alpha edge but vary the threshold for edge of the font
        // the higher the value for ColorCenter the thinner the font
        self.view.setTextAlphaCenter(0.49 - (intValue/10000.0));
        self.view.setTextColorCenter(0.52 - (intValue/10000.0));
      }});
    Object.defineProperty(this.style, "textAlign", {
      set: function (value) {
        self.view.setTextHAlign(ALIGN_MAP[value]);
      }});
    Object.defineProperty(this.style, "textAlignVertical", {
      set: function (value) {
        self.view.setTextVAlign(ALIGN_VERTICAL_MAP[value]);
      }});
    // defaults
    this.style.fontWeight = '200';
    this.style.fontSize = 0.1;
    this.style.textAlign = 'auto';
    this.style.textAlignVertical = 'auto';
    this.props.numberOfLines = 0;
    // undefine the text color so that parent color will be used unless explicity set
    this.style._textColor = undefined;

    // custom measure function for the flexbox layout
    this.style.measure = (width, widthMeasureMode, height, heightMeasureMode) =>
      this.measure(width, widthMeasureMode, height, heightMeasureMode);
  }

  /**
   * Measure the dimensions of the text associated
   * callback for css-layout
   * @param: width - input width extents
   * @param: widthMeasureMode - mode to constrain width CSS_MEASURE_MODE_EXACTLY, CSS_MEASURE_MODE_UNDEFINED
   * @param: height - input height extents
   * @param: heightMeasureMode - mode to constrain height CSS_MEASURE_MODE_EXACTLY, CSS_MEASURE_MODE_UNDEFINED
   * @return: object containing measured width and height
   */
  measure(width, widthMeasureMode, height, heightMeasureMode) {
    let text = this.getText(this.style._textColor || 0xffffffff);
    if (text) {
      if (widthMeasureMode !== computeLayout.CSS_MEASURE_MODE_EXACTLY ||
        heightMeasureMode !== computeLayout.CSS_MEASURE_MODE_EXACTLY) {
        var wordWrapped;
        if ( widthMeasureMode !== computeLayout.CSS_MEASURE_MODE_UNDEFINED ) {
          wordWrapped = OVRUI.wrapLines(
                          this.guiSys.font,
                          text,
                          this._fontSize,
                          width,
                          undefined, // maxHeight
                          this.props._numberOfLines);
        } else {
          wordWrapped = text;
        }
        var dim = OVRUI.measureText(this.guiSys.font, wordWrapped, this._fontSize);
        if ( widthMeasureMode !== computeLayout.CSS_MEASURE_MODE_EXACTLY ) {
          width = dim.maxWidth;
        }
        if ( heightMeasureMode !== computeLayout.CSS_MEASURE_MODE_EXACTLY ) {
          height = dim.maxHeight;
        }
      }
    } else {
      width = width || 0;
      height = height || 0;
    }
    return {
      width: width,
      height: height,
    };
  }

  // children of text are held within textChildren
  // this is to avoid them being used as part of the layout pass
  addChild(index, child) {
    // mark the view as needing new layout
    this.makeDirty();
    this.textChildren.splice(index, 0, child);
  }

  removeChild(index) {
    // mark the view as needing new layout
    this.makeDirty();
    this.textChildren.splice(index,1);
  }

  // return the cached result or if the text is dirty calculate the concentated results
  // TODO: encapsulate fonr properties into output
  getText(parentTextColor) {
    if (!this._textDirty) {
      return this._text;
    }
    let textColor = this.style._textColor ? this.style._textColor : parentTextColor;
    let allText = '';
    for (let i=0; i<this.textChildren.length; i++) {
      let child = this.textChildren[i];
      if (child.isRawText) {
        allText += child.props.text;
      } else
      if (child.isTextNode) {
        allText += child.getText(textColor);
      }
    }
    this._text = String.fromCharCode(OVRUI.SDFFONT_MARKER_COLOR) +
      String.fromCharCode((textColor >> 16)&0xff) + // red
      String.fromCharCode((textColor >> 8)&0xff) + // green
      String.fromCharCode((textColor >> 0)&0xff) + // blue
      String.fromCharCode((textColor >> 24)&0xff) + // alpha
      allText;
    this._textDirty = false;
    // make sure the visual representation is resubmitted
    this._visualTextDirty = true;
    return this._text;
  }

  /**
   * Customised present layout so that the border settings can be updated
   */
  presentLayout() {
    super.presentLayout(this);
    if ((this._textDirty || this._visualTextDirty)
      || this.layout.width != this.previousWidth
      || this.layout.height != this.previousHeight ) {
      var wordWrapped = OVRUI.wrapLines(
                          this.guiSys.font,
                          this.getText(this.style._textColor || 0xffffffff),
                          this._fontSize,
                          this.layout.width,
                          this.layout.height,
                          this.props._lineCount);
      this.view.setText(wordWrapped);
      this._visualTextDirty = false;
      this.previousWidth = this.layout.width;
      this.previousHeight = this.layout.height;
    }
  }

  /**
   * Describes the properies representable by this view type and merges
   * with super type
   */
  static describe() {
    return merge(super.describe(), {
      // declare properties sent from react to runtime
      NativeProps: {
        numberOfLines: 'number',
        hitSlop: 'number',
      }
    });
  }
}
