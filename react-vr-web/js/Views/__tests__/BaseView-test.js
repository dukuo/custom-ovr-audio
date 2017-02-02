/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

'use strict';

jest.dontMock('../BaseView');

const BaseView = require('../BaseView').default;

describe('RCTBaseView', () => {
  it('establishes a setter for renderGroup', () => {
    const bv = new BaseView();
    bv.view = {};
    bv.style.renderGroup = 2;
    expect(bv.view.renderGroup).toBe(2);
  });

  it('establishes setters for interaction events', () => {
    const bv = new BaseView();
    bv.view = {
      setIsMouseInteractable: jest.fn(),
      setIsInteractable: jest.fn(),
      forceRaycastTest: jest.fn(),
    };
    const fn = () => {};
    bv.props.onInput = fn;
    expect(bv.view.setIsMouseInteractable.mock.calls.length).toBe(1);
    expect(bv.view.setIsInteractable.mock.calls.length).toBe(1);
    expect(bv.view.forceRaycastTest.mock.calls.length).toBe(1);
    expect(bv.props._onInput).toBe(fn);

    bv.props.onGazeEnter = fn;
    expect(bv.view.setIsMouseInteractable.mock.calls.length).toBe(1);
    expect(bv.view.setIsInteractable.mock.calls.length).toBe(2);
    expect(bv.view.forceRaycastTest.mock.calls.length).toBe(2);
    expect(bv.props._onGazeEnter).toBe(fn);
  });

  it('can manage children', () => {
    const bv = new BaseView();
    bv.view = {
      add: jest.fn(),
      remove: jest.fn(),
    };
    const c1 = new BaseView();
    c1.view = {};
    bv.addChild(0, c1);
    expect(bv.children).toEqual([c1]);
    expect(bv.view.add.mock.calls[0][0]).toBe(c1.view);
    expect(bv.getChildCount()).toBe(1);
    const c2 = new BaseView();
    c2.view = {};
    bv.addChild(1, c2);
    expect(bv.children).toEqual([c1, c2]);
    expect(bv.view.add.mock.calls[1][0]).toBe(c2.view);
    expect(bv.getChildCount()).toBe(2);
    const c3 = new BaseView();
    c3.view = {};
    bv.addChild(1, c3);
    expect(bv.children).toEqual([c1, c3, c2]);
    expect(bv.view.add.mock.calls[2][0]).toBe(c3.view);
    expect(bv.getChildCount()).toBe(3);
    const c4 = new BaseView();
    c4.view = {};
    bv.addChild(0, c4);
    expect(bv.children).toEqual([c4, c1, c3, c2]);
    expect(bv.view.add.mock.calls[3][0]).toBe(c4.view);
    expect(bv.getChildCount()).toBe(4);

    bv.removeChild(1);
    expect(bv.children).toEqual([c4, c3, c2]);
    expect(bv.view.remove.mock.calls[0][0]).toBe(c1.view);
    expect(bv.getChildCount()).toBe(3);
    bv.removeChild(0);
    expect(bv.children).toEqual([c3, c2]);
    expect(bv.view.remove.mock.calls[1][0]).toBe(c4.view);
    expect(bv.getChildCount()).toBe(2);
  });

  it('fires onLayout events', () => {
    const bv = new BaseView();
    const cf = jest.fn();
    bv.UIManager = {
      _rnctx: {
        callFunction: cf,
      }
    };
    bv.view = {};
    bv.props.onLayout = () => {};
    bv.tag = 4;
    bv.layout.width = 100;
    bv.layout.height = 100;
    bv.layout.top = 5;
    bv.layout.left = 50;
    bv.presentLayout();
    expect(cf.mock.calls[0]).toEqual([
      'RCTEventEmitter',
      'receiveEvent',
      [4, 'topLayout', {x: 50, y: 5, width: 100, height: 100}],
    ]);

    bv.style.layoutOrigin = [0.5, 0.5];
    bv.presentLayout();
    expect(cf.mock.calls[1]).toEqual([
      'RCTEventEmitter',
      'receiveEvent',
      [4, 'topLayout', {x: 0, y: -45, width: 100, height: 100}],
    ]);
  });

  it('applies transforms to views', () => {
    const bv = new BaseView();
    bv.view = {
      setLocalTransform: jest.fn(),
    };
    bv.style.transform = [{translate: [1, 1, 1]}];
    bv.presentLayout();
    expect(bv.view.setLocalTransform.mock.calls[0][0]).toBe(bv.style.transform);
    expect(bv.view.owner).toBe(bv);
  });

  it('sets the frame on compatible views', () => {
    const bv = new BaseView();
    bv.view = {
      setFrame: jest.fn(),
    };
    bv.UIManager = {};
    bv.style.layoutOrigin = [0.5, 0.5];
    bv.layout.width = 40;
    bv.layout.height = 60;
    bv.layout.top = 100;
    bv.layout.left = 100;
    bv.presentLayout();

    expect(bv.view.setFrame.mock.calls[0]).toEqual([
      80,
      -70,
      40,
      60,
      undefined,
    ]);
    expect(bv.view.owner).toBe(bv);
  });
});
