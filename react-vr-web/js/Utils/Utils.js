/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */


// Implements exports.merge() method, which merges properties of two objects into one.

export function merge(foo, bar) {
  var merged = {};
  for (var each in bar) {
    if (foo.hasOwnProperty(each) && bar.hasOwnProperty(each)) {
      if (typeof(foo[each]) == "object" && typeof(bar[each]) == "object") {
        merged[each] = exports.merge(foo[each], bar[each]);
      } else {
        merged[each] = bar[each];
      }
    } else if(bar.hasOwnProperty(each)) {
      merged[each] = bar[each];
    }
  }
  for (var each in foo) {
    if (!(each in bar) && foo.hasOwnProperty(each)) {
      merged[each] = foo[each];
    }
  }
  return merged;
}

export function isPositive(value) {
  return (typeof value === 'number') && (value >= 0);
}
