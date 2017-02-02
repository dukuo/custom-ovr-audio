/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

const MockUIView = jest.fn(() => ({
  add: jest.fn(),
  remove: jest.fn(),
}));

const loadTexMock = jest.fn();
const MockTextureLoader = jest.fn(() => ({
  load: loadTexMock,
}));

const loadOBJMock = jest.fn(() => Promise.resolve({}));
const removeReferencesMock = jest.fn();

jest
  .dontMock('../Mesh')
  .dontMock('../BaseView')
  .mock('../../Loaders/WaveformOBJ/OBJLoader', () => ({
    load: loadOBJMock,
    removeReferences: removeReferencesMock,
  }))
  .mock('ovrui', () => ({
    UIView: MockUIView,
  }), {virtual: true})
  .mock('three', () => ({
    MeshBasicMaterial: jest.fn(),
    DoubleSide: 'DoubleSide',
    TextureLoader: MockTextureLoader,
    ClampToEdgeWrapping: 'ClampToEdgeWrapping',
    LinearFilter: 'LinearFilter',
  }), {virtual: true});

const Mesh = require('../Mesh').default;

describe('RCTMesh', () => {
  it('loads the object upon setting the source', (done) => {
    const m = new Mesh();
    m.props.source = {mtl: {uri: 'mesh.mtl'}, mesh: {uri: 'mesh.obj'}};
    expect(loadOBJMock.mock.calls[0]).toEqual(['mesh.obj', 'mesh.mtl', false]);
    expect(m._mtlCacheKey).toBe('mesh.mtl');
    expect(m._objCacheKey).toBe('mesh.obj');
    // Wait for the loader
    setTimeout(() => {
      expect(m.mesh).toBeTruthy();
      expect(m.view.add.mock.calls[0][0]).toBe(m.mesh);
      done();
    }, 1);
  });

  it('removes any references when disposed', (done) => {
    const m = new Mesh();
    m.props.source = {mtl: {uri: 'mesh.mtl'}, mesh: {uri: 'mesh.obj'}};
    expect(loadOBJMock.mock.calls[0]).toEqual(['mesh.obj', 'mesh.mtl', false]);
    // Wait for the loader
    setTimeout(() => {
      try {
        m.dispose();
        expect(removeReferencesMock.mock.calls[0]).toEqual(['mesh.obj', 'mesh.mtl']);
        done();
      } catch (e) {
        console.error(e);
      }
    }, 1);
  });
});
