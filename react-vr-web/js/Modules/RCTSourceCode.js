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

import Module from './Module';

import type {ReactNativeContext} from '../ReactNativeContext';

/**
 * Source code module to allow React code to lookup source maps
 * @class RCTSourceCode
 * @extends Module
 */
export default class RCTSourceCode extends Module {

  scriptURL: string;
  _rnctx: ReactNativeContext;

  constructor(rnctx: ReactNativeContext) {
    super('RCTSourceCode');
    this.scriptURL = 'http://localhost:8081/';
    this._rnctx = rnctx;
  }

	getScriptText(resolve: number, reject: number) {
		this._rnctx.invokeCallback(resolve, [{fullSourceMappingURL : 'http://localhost:8081/'}]);
	}
}
