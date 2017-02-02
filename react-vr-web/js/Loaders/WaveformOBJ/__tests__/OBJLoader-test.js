/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

jest
  .dontMock('../OBJLoader')
  .dontMock('../../../Utils/RefCountCache')
  .mock('../OBJParser', () => ({
    readOBJFile: jest.fn(() => ({})),
  }))
  .mock('three', () => ({
    MeshBasicMaterial: jest.fn(),
    DoubleSide: 'DoubleSide',
    ClampToEdgeWrapping: 'ClampToEdgeWrapping',
    LinearFilter: 'LinearFilter',
  }), {virtual: true});

const OBJLoader = require('../OBJLoader');

function Deferred() {
  this._promise = new Promise((res, rej) => {
    this.resolve = res;
    this.reject = rej;
  });
  this.then = (...args) => this._promise.then.apply(this._promise, args);
}

describe('OBJLoader', () => {
  it('only runs one fetch for parallel calls', () => {
    const deferred = new Deferred();
    window.fetch = jest.fn(() => deferred);
    OBJLoader.fetchAndCacheOBJ('objpath');
    expect(window.fetch.mock.calls.length).toBe(1);
    OBJLoader.fetchAndCacheOBJ('objpath');
    expect(window.fetch.mock.calls.length).toBe(1);
  });

  it('uses cached results for object loading', (done) => {
    const deferred = new Deferred();
    window.fetch = jest.fn(() => deferred);
    OBJLoader.fetchAndCacheOBJ('doubleload').then((state1) => {
      OBJLoader.fetchAndCacheOBJ('doubleload').then((state2) => {
        expect(state2).toBe(state1);
        done();
      }).catch(e => console.error(e));
    }).catch(e => console.error(e));
    deferred.resolve({text: () => Promise.resolve('OBJ DATA')});
  });

  it('will reject cache entry when all references have been removed', (done) => {
    const deferred = new Deferred();
    window.fetch = jest.fn(() => deferred);
    OBJLoader.fetchAndCacheOBJ('refmath').then((state1) => {
      expect(window.fetch.mock.calls.length).toBe(1);
      OBJLoader.removeReferences('refmath');
      const secondLoad = OBJLoader.fetchAndCacheOBJ('refmath');
      expect(window.fetch.mock.calls.length).toBe(2);
      secondLoad.then((state2) => {
        expect(state2).not.toBe(state1);
        done();
      }).catch(e => console.error(e));
    }).catch(e => console.error(e));
    deferred.resolve({text: () => Promise.resolve('OBJ DATA')});
  });
});
