/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */


/**
 * Class for using a resource and automaticlly update when the resource binded to the url changed.
 */
export function RCTBindedResource(resourceManager) {
  this.resourceManager = resourceManager;
  this.url = undefined;
  this.callback = undefined;
}

RCTBindedResource.prototype = Object.assign( Object.create( Object.prototype ), {
  constructor: RCTBindedResource,

  /**
   * bind callback to a url
   * @param {url} url - The url.
   * @param {function} defaultRequest - the fall back request function when
   *  the url is not a valid url for resourceManager
   * @param {function} callback - the callback function when the resouce updated
   */
  request: function(url, defaultRequest, callback) {
    // unregister previous url
    this.unregister();
    const self = this;
    const requestUrl = url;
    // If it's a valid url in resource manager
    if (this.resourceManager.isValidUrl(url)) {
      const requestCallback = function(url) {
        // before calling the callback, check if the requestUrl is current url
        if(self.url === requestUrl) {
          const parsed = self.resourceManager.parseUrl(url);
          callback(self.resourceManager.getResource(parsed.protocol, parsed.handle));
        }
      }
      // Register the listener
      this.resourceManager.addListener(url, requestCallback);
      this.callback = requestCallback;
      this.url = requestUrl;

      // Call the callback to get current resourse
      requestCallback(url);
    } else {
      const requestCallback = function(resourse) {
        // before calling the callback, check if the requestUrl is current url
        if(self.url === requestUrl) {
          callback(resourse);
        }
      }
      this.callback = requestCallback;
      this.url = requestUrl;
      defaultRequest(url, requestCallback);
    }
  },

  unregister: function() {
    if (this.resourceManager.isValidUrl(this.url)) {
      this.resourceManager.removeListener(this.url, this.callback)
    }
  },

  /**
   * call this before remove a RCTBindedResource, it will unresister the
   * listener of the url
   */
  dispose: function() {
    this.unregister();
  },
});

