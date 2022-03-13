(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

/**
 * Copyright (c) 2009 - 2018 Benjamin Toll (benjamintoll.com)
 *
 * This file is part of pete-core.
 *
 * pete-core is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pete-core is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with pete-core.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
var create = Object.create;

var createExtendFn = function createExtendFn(methodName) {
  return function (proto) {
    var obj = create(proto);

    for (var _len = arguments.length, src = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      src[_key - 1] = arguments[_key];
    }

    core[methodName].apply(core, [obj].concat(src)); // Do any post-processing on the newly-minted object.

    if (obj.$extend) {
      obj.$extend.apply(obj, src);
    }

    return obj;
  };
};

var mixin = function mixin(dest) {
  for (var _len2 = arguments.length, src = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    src[_key2 - 1] = arguments[_key2];
  }

  // No support in IE.
  if (!Object.assign) {
    src.forEach(function (o) {
      for (var _i = 0, _Object$keys = Object.keys(o); _i < _Object$keys.length; _i++) {
        var prop = _Object$keys[_i];
        dest[prop] = o[prop];
      }
    });
  } else {
    src.forEach(function (o) {
      return Object.assign(dest, o);
    });
  }

  return dest;
};

var mixinIf = function mixinIf(dest) {
  for (var _len3 = arguments.length, src = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    src[_key3 - 1] = arguments[_key3];
  }

  src.forEach(function (o) {
    for (var _i2 = 0, _Object$keys2 = Object.keys(o); _i2 < _Object$keys2.length; _i2++) {
      var prop = _Object$keys2[_i2];

      if (!dest[prop]) {
        dest[prop] = o[prop];
      }
    }
  });
  return dest;
};

var core = {
  /**
   * @function emptyFn
   * @param None
   * @return {Function}
   */
  emptyFn: function emptyFn() {},

  /**
   * @function create
   * @param {Object} The base prototype.
   * @param {...Object[]} Optional. Any number of additional objects to be mixed into the new object.
   * @return {Object} The new, extended prototype.
   *
   * Only own, enumerable keys are copied over into the new object.
   */
  create: createExtendFn('mixin'),

  /**
   * @function createIf
   * @param {Object} The base prototype.
   * @param {...Object[]} Optional. Any number of additional objects to be mixed into the new object.
   * @return {Object} The new, extended prototype.
   *
   * Only own, enumerable keys are copied over into the new object.
   *
   * In addition, only fields that don't exist in the destination object are copied over.
   */
  createIf: createExtendFn('mixinIf'),

  /**
   * @function mixin
   * @param {Object} dest
   * @param {Variadic} src
   * @return {Object}
   *
   * Mixes in all properties of `src` to `dest`. Doesn't check for pre-existing properties.
   */
  mixin: mixin,

  /**
   * @function mixinIf
   * @param {Object} dest
   * @param {Variadic} src
   * @return {Object}
   *
   * Copies all properties of `src` to `dest` that don't exist in `child`.
   */
  mixinIf: mixinIf
};
var _default = core;
exports["default"] = _default;
},{}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "core", {
  enumerable: true,
  get: function get() {
    return _core["default"];
  }
});
Object.defineProperty(exports, "observer", {
  enumerable: true,
  get: function get() {
    return _observer["default"];
  }
});

var _core = _interopRequireDefault(require("./core"));

var _observer = _interopRequireDefault(require("./observer"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
},{"./core":1,"./observer":3}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _core = _interopRequireDefault(require("./core"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Copyright (c) 2009 - 2018 Benjamin Toll (benjamintoll.com)
 *
 * This file is part of pete-core.
 *
 * pete-core is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pete-core is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with pete-core.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
var hasSubscribers = function hasSubscribers(type) {
  var events = this.events;
  return events && events[type] && events[type].length;
};

var observer = {
  /**
   * @function fire
   * @param {String} type
   * @param {Variadic} options Optional
   * @return {None}
   *
   * Publishes a custom event. The first argument passed to the observer is the name of the event.
   * Optionally, call with a variable number of arguments that will be passed to the subscribers.
   */
  fire: function fire(type) {
    var _this = this;

    for (var _len = arguments.length, options = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      options[_key - 1] = arguments[_key];
    }

    if (hasSubscribers.call(this, type)) {
      this.events[type].forEach(function (fn) {
        return fn.apply(_this, options);
      });
    }
  },

  /**
   * @function isObserved
   * @param {String} type
   * @return {Boolean}
   *
   * Returns `true` if the event has one or more subscribers (`false` otherwise). Note it doesn't query for a specific handler.
   */
  isObserved: function isObserved(type) {
    return hasSubscribers.call(this, type);
  },

  /**
   * @function purgeSubscribers
   * @param {Array/None} type
   * @return {None}
   *
   * If passed an array of string types, it will remove their subscribers.
   * Otherwise, removes all of the observable's subscribers.
   */
  purgeSubscribers: function () {
    var subscribers;

    var purge = function purge(type) {
      subscribers = this.events[type];
      subscribers = subscribers.map(function (fn) {
        return null;
      });
      this.events[type] = [];
    };

    return function () {
      if (!this.events) {
        return;
      }

      for (var _len2 = arguments.length, types = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        types[_key2] = arguments[_key2];
      }

      if (!types.length) {
        for (var _i = 0, _Object$keys = Object.keys(this.events); _i < _Object$keys.length; _i++) {
          var type = _Object$keys[_i];
          purge.call(this, type);
        }
      } else {
        types.forEach(purge.bind(this));
      }
    };
  }(),
  subscribableEvents: function subscribableEvents() {
    return !this.events ? null : Object.keys(this.events).join(', ');
  },

  /**
   * @function subscribe
   * @param {String} type Event to listen for
   * @param {Function} fn Callback
   * @return {Boolean}
   *
   * Listen to a pre-defined event by passing the name of the event to and the callback to be invoked when that event occurs.
   */
  subscribe: function subscribe(type, fn) {
    var rtn = false;

    if (!this.events) {
      return rtn;
    }

    if (this.events[type]) {
      this.events[type].push(fn);
      rtn = true;
    }

    return rtn;
  },

  /**
   * @function subscriberEvents
   * @param {Array} evs
   * @return {None}
   *
   * Define the custom events that the type will expose. Expects an array of custom events. If the object
   * then subscribes to one of the exposed events, the function will be mapped to the event name in `events`.
   */
  subscriberEvents: function subscriberEvents(v) {
    var _this2 = this;

    if (!this.events) {
      this.events = {};
    }

    v.forEach(function (a) {
      if (!_this2.events[a]) {
        _this2.events[a] = [];
      }
    });
  },

  /**
   * @function unsubscribe
   * @param {String} type
   * @param {Function} fn
   * @return {Boolean}
   *
   * Remove the event listener that was previously subscribed.
   */
  unsubscribe: function unsubscribe(type, fn) {
    var rtn = false;

    if (hasSubscribers.call(this, type)) {
      var i;

      if (~(i = this.events[type].indexOf(fn))) {
        this.events[type].splice(i, 1);
        rtn = true;
      }
    }

    return rtn;
  }
};
var _default = observer;
exports["default"] = _default;
},{"./core":1}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _peteCore = require("pete-core");

var _util = _interopRequireDefault(require("./util"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Copyright (c) 2009 - 2018 Benjamin Toll (benjamintoll.com)
 *
 * This file is part of pete-dom.
 *
 * pete-dom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pete-dom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with pete-dom.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
// TODO: CORS support.
var emptyFn = _peteCore.core.emptyFn;
var requests = {};
/**
 * @function getDefaults
 * @type Object
 *
 * Contains the default configuration options which can be changed
 * within the object literal passed as the parameter to `ajax.load`.
 */

var getDefaults = function getDefaults() {
  return {
    async: true,
    data: '',
    // The headers that will be returned (for HEAD requests only).
    headers: '',
    id: -1,
    postvars: '',
    timeout: 30000,
    type: 'GET',
    url: '',
    abort: emptyFn,
    complete: emptyFn,
    error: emptyFn,
    success: emptyFn
  };
};

var getHttpData = function getHttpData(response, options) {
  // Extract the correct data from the HTTP response.
  //
  // If a HEAD request was made, determine which header name/value pair to return
  // (or all of them) and exit function.
  if (options.type.toUpperCase() === 'HEAD') {
    return !options.headers ? response.getAllResponseHeaders() : response.getResponseHeader(options.headers);
  } // If the specified type is 'script', execute the returned text response as if it were javascript.


  if (options.data.toLowerCase() === 'json') {
    return JSON.parse(response.responseText);
  }

  return isXml(response, options) ? response.responseXML : response.responseText;
};

var getOptions = function getOptions(options) {
  return _peteCore.core.mixin(getDefaults(), options);
};

var getXhr = function getXhr() {
  return new XMLHttpRequest();
};

var isXml = function isXml(response, options) {
  return options.data.toLowerCase() === 'xml' || response.getResponseHeader('Content-Type').indexOf('xml') > -1;
};

var sendRequest = function sendRequest(xhr, options) {
  var requestId = _util["default"].increment();

  var type = options.type.toUpperCase();
  requests[requestId] = xhr;
  options.id = requestId; // Initialize a callback which will fire x seconds from now, canceling the request
  // if it has not already occurred.

  setTimeout(function () {
    if (xhr) {
      xhr.abort();
      options.abort();
    }
  }, options.timeout);

  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4) {
      var result = getHttpData(xhr, options);
      ajax.onComplete(result, options, wasSuccessful(xhr), xhr); // Clean up after ourselves to avoid memory leaks.

      xhr = null;
    }
  };

  if (type === 'HEAD') {
    xhr.open(type, options.url);
  } else {
    xhr.open(type, options.url, options.async);
  } // Establish the connection to the server.


  if (type === 'POST') {
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.send(options.postvars);
  } else {
    xhr.send(null);
  }
};

var onComplete = function onComplete(response, request, success, xhr) {
  var methodName = success ? 'success' : 'error';
  request[methodName](response, request, success, xhr);
  request.complete();
  delete requests[request.id];
};

var wasSuccessful = function wasSuccessful(xhr) {
  return (// If no server status is provided and we're actually requesting a local file then it was successful.
    !xhr.status && location.protocol === 'file:' || // Any status in the 200 range is good.
    xhr.status >= 200 && xhr.status < 300 || // Successful if the document has not been modified.
    xhr.status === 304
  );
}; // ||
//            // Safari returns an empty status if the file has not been modified.
//            Pete.isSafari && typeof r.status === 'undefined';


var ajax = {
  getRequests: function getRequests() {
    return requests;
  },

  /**
   * @function load
   * @param {Object} options
   * @return {String/XML/JSON} Optional. Will only return if configured as synchronous.
   *
   * Used for general-purpose Ajax request. Define callbacks and other customizable features within `options`.
   *
   *      ajax.load({
   *          url: 'http://www.benjamintoll.com/',
   *          type: 'get',
   *          success: resp => {
   *              // ...
   *          }
   *      });
   *
   */
  load: function load(options) {
    var opts = getOptions(options);
    var xhr = getXhr(); // TODO: Make all private methods public?

    sendRequest(xhr, opts);

    if (!opts.async) {
      if (wasSuccessful(xhr)) {
        return getHttpData(xhr, options);
      }
    }
  },
  // This has to be exposed in case a prototype defines its own API.
  onComplete: onComplete
};
var _default = ajax;
exports["default"] = _default;
},{"./util":11,"pete-core":2}],5:[function(require,module,exports){
/**
 * Copyright (c) 2009 - 2018 Benjamin Toll (benjamintoll.com)
 *
 * This file is part of pete-dom.
 *
 * pete-dom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pete-dom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with pete-dom.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _peteCore = require("pete-core");

var _element = _interopRequireDefault(require("./element"));

var _pete = _interopRequireDefault(require("./pete"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

// Composite 'inherits' each function from Element's prototype object.
// Note that each 'inherited' function will return invoke() which
// will call each function as a method of Element.
var proto = {};
var name;

for (name in _element["default"]) {
  if (typeof _element["default"][name] === 'function') {
    // TODO: Don't include $compose or else an exception will be thrown when trying to invoke .invoke on a Element!
    if (name !== '$extend') {
      _pete["default"].wrap(proto, name);
    }
  }
}

var composite = _peteCore.core.create(proto, {
  isComposite: true,

  /**
   * @function $extend
   * @return {None}
   *
   * Shouldn't be called directly. To be called whenever a composite object is composed.
   */
  // TODO
  $extend: function $extend() {
    this.el = _peteCore.core.create(_element["default"], {
      dom: null
    });
  },

  /**
   * @function getCount
   * @param {None}
   * @return {Number}
   *
   * Returns the number of objects in the composite.
   */
  getCount: function getCount() {
    return this.elements.length;
  },

  /**
   * @function getFirst
   * @param {None}
   * @return {HTMLElement}
   *
   * Returns the first dom element in the composite.
   */
  getFirst: function getFirst() {
    return this.elements[0];
  },

  /**
   * @function getLast
   * @param {None}
   * @return {HTMLElement}
   *
   * Returns the last dom element in the composite.
   */
  getLast: function getLast() {
    return this.elements[this.elements.length - 1];
  },

  /**
   * @function invoke
   * @param {String/HTMLElement} elem
   * @return {Element}
   *
   * Not to be called directly.
   */
  invoke: function invoke(fn, args) {
    var el = this.el;
    var elements = this.elements;
    elements.forEach(function (dom) {
      el.dom = dom; // TODO: Better way?
      // We really do our best to not touch any object we don't own, but in this case we have
      // to stamp on an id (and it's better than creating a _pete object but the composite or
      // the Fly isn't the owner).

      if (!dom.id && !dom._pete) {
        dom.id = _pete["default"].id();
      }

      _element["default"][fn].apply(el, args);
    }); // Let's support chaining composite methods.

    return this;
  }
});

var _default = composite;
exports["default"] = _default;
},{"./element":7,"./pete":9,"pete-core":2}],6:[function(require,module,exports){
/**
 * Copyright (c) 2009 - 2018 Benjamin Toll (benjamintoll.com)
 *
 * This file is part of pete-dom.
 *
 * pete-dom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pete-dom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with pete-dom.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _peteCore = require("pete-core");

var _element = _interopRequireDefault(require("./element"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var dom = {
  /**
   * `options` can be either an Object or a Boolean (useCapture).
   * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   */
  event: {
    add: function add(element, type, handler, options) {
      return element.addEventListener(type, handler, options);
    },
    remove: function remove(element, type, handler, options) {
      return element.removeEventListener(type, handler, options);
    }
  },
  // https://jsperf.com/bt-dom-element-creation/edit

  /**
   * @function create
   * @param {object} obj
   * @param {boolean} returnDom optional
   * @return {element/HTMLElement}
   *
   * Dynamically create an elem and optionally append to a specified parent (and optionally have
   * that parent created if not already in the dom). Optionally provide an `attr` object, a `style`
   * object and an `items` array.
   *
   * Returns an element wrapper. If `returnDom` is `true`, returns an HTMLElement.
   * Note that you can pass any HTMLElement attribute in the `attr` object.
   *
   * @example
  dom.create({tag: 'ul',
      attr: {
          id: 'topLevel',
          cls: 'floater',
          onclick: fnHelloWorld //note you can reference a named function...;
          //onclick: function () { alert('hello, world!'); } //...or an anonymous function;
          //onclick: "alert('hello, world!');" //...or even a string;
      },
      style: {
          background: '#ffc',
          border: '1px solid #ccc',
          margin: '40px',
          padding: '20px'
      },
      items: [{
          tag: 'li',
          text: '<a href="#" onclick="alert(event); return false;">click me</a>',
          attr: {
              id: 'main',
              cls: 'expand'
          }
      }, {
          tag: 'li',
          attr: {
              cls: 'expand'
          },
          items: [{
              tag: 'a',
              attr: {
                  href: '#',
                  onclick: "alert('Hello, World!'); return false;",
                  innerHTML: 'No, click me!'
              }
          }]
      }],
      parent: document.body
  });
   ----------------------------------
  this would create a list like this
  ----------------------------------
   <ul style='border: 1px solid #ccc; margin: 40px; padding: 20px;
      background: #ffc;' class='floater' id='topLevel' onclick='fnHelloWorld();'>
      <li class='expand' id='main'>
          <a href='#' onclick='alert(event); return false;'>Click Me</a>
      </li>
      <li class='expand'>
          <a href='#' onclick='alert('Hello, World!'); return false;'>No, click me!</a>
      </li>
  </ul>
   */
  create: function create(obj, returnDOM) {
    var id = obj.id;

    var el = _peteCore.core.create(_element["default"], {
      dom: document.createElement(obj.tag),
      id: id
    });

    var d = el.dom;
    var o, alt, parent, item; // Pass id as either:
    //      attr: { id: 'Pete' }
    //  or
    //      id: 'Pete'

    if (id) {
      d.id = id;
    }

    if (obj.attr) {
      o = obj.attr;

      for (var _i = 0, _Object$keys = Object.keys(o); _i < _Object$keys.length; _i++) {
        var prop = _Object$keys[_i];
        alt = prop; // NOTE html elements don't natively have 'on*' attribute.

        if (prop.indexOf('on') === 0) {
          // NOTE ie6 can't handle i.setAttribute.
          d[prop] = typeof o[prop] === 'function' ? o[prop] : new Function(o[prop]);
        } else {
          if (prop === 'cls') {
            alt = 'className';
          }

          d[alt] = o[prop]; //e.dom.setAttribute(prop, o[prop]);
        }
      }
    }

    if (obj.style) {
      o = obj.style;

      for (var _i2 = 0, _Object$keys2 = Object.keys(o); _i2 < _Object$keys2.length; _i2++) {
        var _prop = _Object$keys2[_i2];

        if (_prop === 'float') {
          d.style[!isIE ? 'cssFloat' : 'styleFloat'] = o[_prop];
          continue;
        }

        d.style[_prop] = o[_prop];
      }
    } // Pass text content as either:
    //      attr: { innerHTML: 'Pete' }
    //  or
    //      text: 'Pete'


    if (obj.text) {
      d.innerHTML = obj.text;
    }

    if (obj.items) {
      o = obj.items;

      for (var i = 0, len = o.length; i < len; i++) {
        item = o[i];

        if (!item.parent) {
          item.parent = d;
        }

        dom.create(item);
      }
    } // The parent isn't in the DOM yet so create it and append all the items to it.


    if (obj.parent && obj.inDOM === false) {
      o = obj.parent;
      parent = typeof o === 'string' ? _peteCore.core.create(_element["default"]) : o;
      parent.appendChild(d);
      return returnDOM ? parent.d : parent; // If a parent elem was given and is already an existing node in the DOM append the node to it.
    } else if (obj.parent) {
      dom.getDom(obj.parent).appendChild(d);
      return returnDOM ? d : el;
    } // Else return the node to be appended later into the DOM.
    else {
      return returnDOM ? d : el;
    }
  },

  /**
   * @function Pete.dom.find
   * @param {String/HTMLElement/element} el
   * @param {String} selector
   * @return {HTMLElement/Boolean}
   *
   * This method finds an ancestor element of `el` by interrogating each of its parent elements using the passed selector.
   * Returns either the found dom element or `false`.
   *
   *      dom.find('test', '#box3[style$=100px;]');
   *
   */
  find: function find(el, selector) {
    if (!el || !selector) {
      throw new Error('Failure to provide arguments in method Pete.dom.find');
    }

    el = _element["default"].get(el, true).parentNode;

    while (el) {
      if (document.querySelector(selector)) {
        return el;
      }

      el = el.parentNode;
    }

    return false;
  },
  getDom: function getDom(el, root) {
    if (!el) {
      return;
    }

    return el.dom ? el.dom : typeof el === 'string' ? (root || document).getElementById(el) : el;
  },

  /**
   * @function Pete.dom.insertAfter
   * @param {HTMLElement} newElement
   * @param {HTMLElement} targetElement
   * @return {None}
   *
   * Inserts `newElement` after `targetElement` in the DOM.
   * Use this helper method when not wanting to instantiate a `element` and thereby invoking `Element.after`.
   */
  insertAfter: function insertAfter(newElement, targetElement) {
    var parent = targetElement.parentNode;

    if (parent.lastChild === targetElement) {
      parent.appendChild(newElement);
    } else {
      parent.insertBefore(newElement, targetElement.nextSibling);
    }
  },

  /**
   * @function Pete.dom.insertHtml
   * @param {String} where Where to insert the html in relation to `elem` - beforeBegin, afterBegin, beforeEnd, afterEnd.
   * @param {HTMLElement} elem
   * @param {String} html
   * @return {HTMLElement}
   *
   * Easily allows for inserting HTML in the document tree.
   * @example
  Example:
   <ul>
    <li>one</li>
    <li>two</li>
    <li>three</li>
    <li>four</li>
    <li>five</li>
  </ul>
   What if you need to append text to one of the list items?  innerHTML kills an element's
  children, and performing an operation to first retrieve the child node and then append
  the new text isn't convenient.
   var html = ' <strong>hundred</strong>';
  Pete.dom.insertHtml('beforeEnd', document.getElementsByTagName('li')[1], html);
   So the list becomes:
   <ul>
    <li>one</li>
    <li>two <strong>hundred</strong></li>
    <li>three</li>
    <li>four</li>
    <li>five</li>
  </ul>
   This is a simple example but the concept can easily be grasped.
   */
  insertHtml: function insertHtml(where, elem, html) {
    where = where.toLocaleLowerCase();

    if (elem.insertAdjacentHTML) {
      switch (where) {
        case 'beforebegin':
          elem.insertAdjacentHTML('BeforeBegin', html);
          return elem.previousSibling;

        case 'afterbegin':
          elem.insertAdjacentHTML('AfterBegin', html);
          return elem.firstChild;

        case 'beforeend':
          elem.insertAdjacentHTML('BeforeEnd', html);
          return elem.lastChild;

        case 'afterend':
          elem.insertAdjacentHTML('AfterEnd', html);
          return elem.nextSibling;
      }

      throw 'Illegal insertion point -> "' + where + '"';
    }

    var range = elem.ownerDocument.createRange();
    var frag;

    switch (where) {
      case 'beforebegin':
        range.setStartBefore(elem);
        frag = range.createContextualFragment(html);
        elem.parentNode.insertBefore(frag, elem);
        return elem.previousSibling;

      case 'afterbegin':
        if (elem.firstChild) {
          range.setStartBefore(elem.firstChild);
          frag = range.createContextualFragment(html);
          elem.insertBefore(frag, elem.firstChild);
          return elem.firstChild;
        } else {
          elem.innerHTML = html;
          return elem.firstChild;
        } // The following return statement is so eslint doesn't complain!


        return;

      case 'beforeend':
        if (elem.lastChild) {
          range.setStartAfter(elem.lastChild);
          frag = range.createContextualFragment(html);
          elem.appendChild(frag);
          return elem.lastChild;
        } else {
          elem.innerHTML = html;
          return elem.lastChild;
        } // The following return statement is so eslint doesn't complain!


        return;

      case 'afterend':
        range.setStartAfter(elem);
        frag = range.createContextualFragment(html);
        elem.parentNode.insertBefore(frag, elem.nextSibling);
        return elem.nextSibling;
    }

    throw 'Illegal insertion point -> "' + where + '"';
  },

  /**
   * @function Pete.dom.isTextBox
   * @param {HTMLElement/element} elem
   * @return {Boolean}
   *
   * A handy way to quickly determine if an element is a textbox or a textarea.  Useful for string trimming and validation.
   *
   *      const oDom = Element.get(this, true);
   *      if (!Pete.dom.isTextBox(oDom)) return;
   *      oDom.value = dom.value();
   *      return this;
   *
   */
  isTextBox: function isTextBox(elem) {
    elem = _element["default"].get(elem, true);
    return elem.nodeName.toLocaleLowerCase() === 'input' && elem.type === 'text' || elem.nodeName.toLocaleLowerCase() === 'textarea';
  },

  /**
   * @function ready
   * @param {Function} fn
   * @param {Function} callback A callback that is called when the window.load event is fired.
   * @return {None}
   *
   * Should be the first statement called in any jsLite application. All code to be invoked at page
   * load should be within the function that is the sole argument.
   */
  ready: function ready(fn, callback) {
    document.addEventListener('DOMContentLoaded', fn, false);

    if (callback) {
      _element["default"].fly(window).on('load', callback);
    }
  },

  /**
   * @function Pete.dom.remove
   * @param {String/Array} toRemove Can be either a single HTMLElement to remove or an Array of HTMLElements
   * @return {HTMLElement/Array} - One or more <code>HTMLElements</code>
   * Removes one or more `HTMLElements` from the DOM and returns the removed element(s).
   *
   * Use this helper method when not wanting to instantiate a `element` and thereby invoking `Element.remove`.
   *
   *      const oElems = Pete.dom.remove('test');
   *      const aElems = Pete.dom.remove(['test', 'anotherTest', 'oneMore']);
   *
   */
  remove: function remove(toRemove) {
    var removedElements, elem, i, len;

    if (!toRemove) {
      return false;
    }

    if (typeof toRemove === 'string') {
      elem = Pete.getDom(toRemove);

      if (elem) {
        return elem.parentNode.removeChild(elem);
      }
    } else if (toRemove.constructor === Array) {
      removedElements = [];

      for (i = 0, len = toRemove.length; i < len; i++) {
        elem = Pete.getDom(toRemove[i]);

        if (elem) {
          removedElements.push(elem.parentNode.removeChild(elem));
        }
      }

      return removedElements;
    }
  },
  removeChildren: function removeChildren(v) {
    // TODO: What is elem???
    var elem; // `v` can either be an array (remove multiple nodes at once) or an object or a string (only remove one node).

    if (v.constructor === Array) {
      for (var i = 0, len = v.length; i < len; i++) {
        Pete.getDom(v[i]).parentNode.removeChild(elem);
      }
    } else {
      Pete.getDom(v).parentNode.removeChild(elem);
    }
  }
};
var _default = dom;
exports["default"] = _default;
},{"./element":7,"pete-core":2}],7:[function(require,module,exports){
/**
 * Copyright (c) 2009 - 2018 Benjamin Toll (benjamintoll.com)
 *
 * This file is part of pete-dom.
 *
 * pete-dom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pete-dom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with pete-dom.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
// TODO: destroy function?
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _peteCore = require("pete-core");

var _pete = _interopRequireDefault(require("./pete"));

var _composite = _interopRequireDefault(require("./composite"));

var _dom = _interopRequireDefault(require("./dom"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _createForOfIteratorHelper(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (!it) { if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = it.call(o); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

function _readOnlyError(name) { throw new TypeError("\"" + name + "\" is read-only"); }

/**
* @function element
* @param None
* @return {element}
*/
var element = _peteCore.core.create(_peteCore.observer, function () {
  // Test for possible dom id:
  //      #?              - May begin with a '#'.
  //      [a-zA-Z]{1}     - Must begin with a letter.
  //      [a-zA-Z0-9_-]*  - After the first char may contain a letter, number, underscore or hyphen.
  var reDomId = /^#?[a-zA-Z]{1}[a-zA-Z0-9_-]*$/;
  var reToken = /\{([a-z]+)\}/gi;
  return {
    /**
     * @function $extend
     * @param {None}
     * @return {None}
     *
     * Is called whenever a element object is composed as part of the internal object creation functionality.
     * Any object inititialization logic can/should be placed in here.
     */
    $extend: function $extend() {
      var dom = this.dom;

      var id = this.id || _pete["default"].id();

      this.id = id; // TODO: Do we want to poke this on here?

      if (dom && !dom._pete) {
        dom._pete = {
          ownerId: id
        };
      }
    },

    /**
     * @function addClass
     * @param {String} cls
     * @return {element}
     *
     * Adds a class to an element if it's not present.
     */
    addClass: function addClass(cls) {
      if (!this.hasClass(cls)) {
        this.dom.className += ' ' + cls;
      }

      return this;
    },

    /**
     * @function after
     * @param {element/HTMLElement/String} elem
     * @return {element}
     *
     * Inserts the new element after the parent in the DOM.
     */
    after: function after(elem) {
      var targetElement = this.dom;
      var newElement = element.get(elem, true);
      var parent = targetElement.parentNode;

      if (parent.lastChild === targetElement) {
        parent.appendChild(newElement);
      } else {
        parent.insertBefore(newElement, targetElement.nextSibling);
      }

      return this;
    },

    /**
     * @function append
     * @param {element/HTMLElement/Array} elem
     * @return {element}
     *
     * Appends an element or HTMLElement or a collection of them to a parent. When appending
     * multiple elements, a document fragment is used for optimization.
     */
    append: function append(elem) {
      var fragment;

      if (Array.isArray(elem)) {
        fragment = document.createDocumentFragment();
        elem.forEach(function (v) {
          return fragment.appendChild(element.get(v, true));
        });
        this.dom.appendChild(fragment);
      } else {
        this.dom.appendChild(element.get(elem).dom);
      }

      return this;
    },

    /**
     * @function before
     * @param {element/HTMLELement/String} elem
     * @return {element}
     *
     * Inserts the new element before the parent in the DOM. Shortcut for the standard DOM API insertBefore method.
     */
    before: function before(elem) {
      this.dom.parentNode.insertBefore(element.get(elem, true));
      return this;
    },

    /**
     * @function closest
     * @param {String} elem
     * @return {element/Boolean}
     *
     * Finds the closest parent element that matches `elem`. Inspired by the jQuery method of the same name.
     * Returns Boolean `false` if no matching parent element is found.
     */
    closest: function closest(elem) {
      var parent = this.dom.parentNode;

      while (parent && parent.nodeName) {
        if (parent.nodeName.toLocaleLowerCase() === elem) {
          return element.get(parent);
        } else {
          parent = (_readOnlyError("parent"), parent.parentNode);

          if (parent === document) {
            return false;
          }
        }
      }
    },

    /**
     * @function contains
     * @param {element/HTMLElement} el
     * @return {Boolean}
     *
     * https://developer.mozilla.org/en-US/docs/Web/API/Node/contains
     */
    contains: function contains(el) {
      return this.dom.contains(_dom["default"].getDom(el));
    },

    /**
     * @function disable
     * @param {Boolean} cache (Optional)
     * @return {element}
     *
     *
     * If `cache` is true, a reference to each `HTMLElement` will be stored in `pete.disabled`.
     * Each element in the cache can then be accessed by its id attribute value.
     *
     * Usually, this isn't necessary and re-enabling the element (`element.enable`) will remove
     * the reference from the cache.
     *
     * Important: If disabling links, a `disabled` class is expected. The default class resides
     * in `jslite.css` but can be overridden by a user-defined stylesheet.
     *
     *
     *      const list = element.gets('#theList li');
     *      list.disable('disabled');
     *
     *      // A classname is not needed when disabling <input>s.
     *      const inputs = element.gets('#theForm input');
     *      inputs.disable();
     *
     */
    disable: function disable(cache) {
      var d = this.dom;
      var elem, remove;

      if (d.onclick) {
        d.originalHandler = d.onclick;
      }

      d.onclick = function () {
        return false;
      }; // If this element has a handler (W3C) in the cache then remove it.


      if (_pete["default"].events[d.id]) {
        elem = _pete["default"].events[d.id];
        remove = _pete["default"].dom.event.remove;

        var _iterator = _createForOfIteratorHelper(elem),
            _step;

        try {
          for (_iterator.s(); !(_step = _iterator.n()).done;) {
            var i = _step.value;
            remove(d, i, elem[i]);
          }
        } catch (err) {
          _iterator.e(err);
        } finally {
          _iterator.f();
        }
      }

      if (d.nodeName.toLocaleLowerCase() === 'input') {
        d.disabled = true;
      } else {
        this.addClass('disabled');
      }

      if (cache) {
        _pete["default"].disabled[d.id] = d;
      }

      return this;
    },

    /**
     * @function element.enable
     * @param {None}
     * @return {element}
     *
     * If the element is in the `pete.disabled` cache, it's removed.
     *
     *      list.enable();
     *
     *      // A classname is not needed when re-enabling <input>s.
     *      inputs.enable();
     *
     */
    enable: function enable() {
      var d = this.dom;
      var elem, add;

      if (d.originalHandler) {
        d.onclick = this.dom.originalHandler;
        d.originalHandler = null;
      } else {
        d.onclick = null;
      } // If this element has a handler (W3C) in the cache then readd it.


      if (_pete["default"].events[d.id]) {
        elem = _pete["default"].events[d.id];
        add = _pete["default"].dom.event.add;

        var _iterator2 = _createForOfIteratorHelper(elem),
            _step2;

        try {
          for (_iterator2.s(); !(_step2 = _iterator2.n()).done;) {
            var i = _step2.value;
            add(d, i, elem[i]);
          }
        } catch (err) {
          _iterator2.e(err);
        } finally {
          _iterator2.f();
        }
      }

      if (d.nodeName.toLocaleLowerCase() === 'input') {
        d.disabled = false;
      } else {
        this.removeClass('disabled');
      }

      if (_pete["default"].disabled[d.id]) {
        delete _pete["default"].disabled[d.id];
      }

      return this;
    },

    /**
     * @function fly
     * @param {HTMLElement/String} el
     * @return {element}
     *
     * For one-off operations. It's modeled on the flyweight design pattern.
     *
     * The first time this method is called it checks an internal property to see if an `element`
     * object has been created. If not, it creates one. If it exists, it's re-used. This is important
     * because the wrapper methods never change, and it's not necessary to keep creating new methods
     * for one-off operations. The element is swapped out and is accessible in the `dom` property.
     *
     * A use case would be when a one-time operation is needed to be performed on an element but a
     * reference to that element is not needed for future use. Re-using the flyweight object is highly
     * recommended for efficiency, as in most cases it's already been created.
     */
    fly: function () {
      var symbol = _pete["default"].globalSymbol;
      var flyweight = {};
      return function (el) {
        if (!flyweight[symbol]) {
          flyweight[symbol] = _peteCore.core.create(element);
        }

        flyweight[symbol].dom = element.get(el, true);
        return flyweight[symbol];
      };
    }(),

    /**
     * @function getHeight
     * @return {String/Null}
     *
     * Gets the height of the element.  Returns the result of the lookup or `null`.
     * NOTE: this method doesn't support composite objects (`composite`).
     *
     *       this.tooltip.width = parseInt(element.fly(this.tooltip).getHeight(), 10);
     *
     */
    getHeight: function getHeight() {
      var height;

      if (this.dom === document.body) {
        height = Math.max(document.documentElement.offsetHeight, document.body.scrollHeight, document.documentElement.clientHeight) + 'px';
      } else {
        height = this.getStyle('height');
      }

      return height;
    },

    /**
     * @function getStyle
     * @param {String} name CSS property name
     * @return {String/Null}
     *
     * Supply a CSS property to lookup.  Returns the result of the lookup or `null`.
     * NOTE: this method doesn't support composite objects (`composite`).
     */
    getStyle: function getStyle(name) {
      // If the property exists in style[] then it's been set recently and is current.
      if (this.dom.style[name]) {
        return this.dom.style[name];
      } else if (document.defaultView && document.defaultView.getComputedStyle) {
        //w3c;
        var obj; // It uses the traditional 'text-align' style of rule writing instead of 'textAlign'.

        name = name.replace(/([A-Z])/g, '-$1');
        name = name.toLocaleLowerCase(); // Get the style object and get the value of the property if it exists.

        obj = document.defaultView.getComputedStyle(this.dom, '');
        return obj && obj.getPropertyValue(name); // IE and early versions of Opera.
      } else if (this.dom.currentStyle) {
        return this.dom.currentStyle[name]; // Otherwise, some other browser is being used.
      } else {
        return null;
      }
    },

    /**
     * @function getWidth
     * @return {String/Null}
     *
     * Gets the width of the element.  Returns the result of the lookup or `null`.
     * NOTE: this method doesn't support composite objects (`composite`).
     */
    getWidth: function getWidth() {
      var width;

      if (this.dom === document.body) {
        width = Math.max(document.body.scrollWidth, document.documentElement.clientWidth) + 'px';
      } else {
        width = this.getStyle('width');
      }

      return width;
    },

    /**
     * @function hasClass
     * @param {String} cls
     * @return {None}
     *
     * Note that wrapping classname in spaces means that a regexp isn't needed.
     *
     */
    hasClass: function hasClass(cls) {
      return cls && (' ' + this.dom.className + ' ').indexOf(' ' + cls + ' ') > -1;
    },

    /**
     * @function hide
     * @param {None}
     * @return {element}
     */
    hide: function hide() {
      this.dom.style.display = 'none';
      return this;
    },

    /**
     * @function next
     * @param {String} elem Optional
     * @param {Boolean} returnDOM Optional
     * @return {element/HTMLElement}
     *
     * Returns an element wrapper. If `returnDOM` is `true`, returns an HTMLElement.
     */
    next: function next(elem, returnDOM) {
      if (elem && typeof elem === 'boolean') {
        returnDOM = elem;
        elem = undefined;
      }

      var nextEl = element.get(this, true).nextSibling;
      return nextEl.nodeType === 1 ? returnDOM ? nextEl : element.fly(nextEl) : next.call(nextEl, elem, returnDOM);
    },

    /**
     * @function on
     * @param {String/Array} type The type of event, i.e. `click` or `change` or `['click', 'change']`
     * @param {Object} scope The scope in which the callback is called (Optional)
     * @param {Boolean} useCapture Specify event phase (defaults to bubble)
     * @return {None}
     *
     * Binds one or more event listeners to the element and adds it/them to the cache. If listening
     * to more than one type of event, pass the events as an array as the first argument.
     */
    on: function on(type, fn) {
      var useCapture = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
      var d = this.dom;
      var id = d.id || d._pete.ownerId; // Probably better to call bind on the function in "userspace" before passing it to element.on.
      //             scope = scope || this;

      if (typeof type === 'string') {
        type = [type];
      }

      type.forEach(function (type) {
        _dom["default"].event.add(d, type, fn, useCapture); // Create the object for each id.


        var arr = [];
        var o = null;

        if (!_pete["default"].events[id]) {
          _pete["default"].events[id] = {};
        }

        o = _pete["default"].events[id]; // Within each id object store the handler for each event type.

        if (!o[type]) {
          o[type] = fn; // If there's more than one handler for a given type then create an array of the handlers and assign it to the type.
        } else {
          if (!Array.isArray(o[type])) {
            arr = (_readOnlyError("arr"), Array.from(o));
            arr.push(fn);
            o[type] = arr; // It's already been cast to an array.
          } else {
            o[type].push(fn);
          }
        }
      });
    },

    /**
     * @function parent
     * @param {String} elem Optional
     * @param {Boolean} returnDOM Optional
     * @return {element/HTMLElement}
     *
     * If no argument is given, return the element's parent. Else, return the first parent whose `nodeName`
     * matches the passed parameter.Returns an element wrapper. If `returnDOM` is `true`, returns an HTMLElement.
     *
     * Returns `false` if no parent is found.
     *
     *      const parent = element.get('#test p span').parent();
     *
     *      // Parent() returns an element by default.
     *      const parent = element.get('#test p span').parent('div').setStyle({
     *          background: 'red',
     *          fontFamily: 'arial'
     *      });
     *
     *      // Have parent() return the HTMLElement.
     *      const parent = element.get('#test p span').parent('div', true).style.background = 'red';
     */
    parent: function parent(elem, returnDOM) {
      var returnElement = function returnElement() {
        return returnDOM ? parentEl : element.get(parentEl);
      };

      var parentEl = element.get(this, true).parentNode;

      if (!parentEl) {
        throw new Error('Parent could not be found');
      }

      if (elem && typeof elem === 'boolean') {
        returnDOM = elem;
        elem = undefined;
      } //return parent.nodeType === 1 ? parent : parent.call(parent);


      if (parentEl.nodeType === 1) {
        if (elem && typeof elem !== 'boolean') {
          // A specific parent nodeName was passed in and the parent hasn't found it yet so keep recursing.
          if (parentEl.nodeName.toLocaleLowerCase() !== elem) {
            // This has to return the final value since it's recursive and we could be dealing with many
            // execution contexts by nature of it being a recursive function.
            return parent.call(parentEl, elem, returnDOM);
          } else {
            return returnElement();
          }
        } else {
          return returnElement();
        }
      } else {
        parent.call(parentEl, elem, returnDOM);
      }
    },

    /**
     * @function previous
     * @param {String} elem Optional
     * @param {Boolean} returnDOM Optional
     * @return {HTMLElement}
     *
     * Returns an element wrapper. If `returnDOM` is `true`, returns an HTMLElement.
     */
    previous: function previous(elem, returnDOM) {
      if (elem && typeof elem === 'boolean') {
        returnDOM = elem;
        elem = undefined;
      }

      var prev = element.get(this, true).previousSibling;

      if (!prev) {
        throw new Error('Previous sibling could not be found');
      }

      return prev.nodeType === 1 ? returnDOM ? prev : element.fly(prev) : previous.call(prev, elem, returnDOM);
    },

    /**
     * @function remove
     * @param {None/String/HTMLElement/element/Boolean} elem The element(s) to remove
     * @return {element/composite}
     *
     * Removes an HTMLElement from the DOM and stores it in the `pete.garbage` cache.
     *
     * This method can be used in the following ways:
     *
     *      - If no param is passed, the method removes itself.
     *      - If a non-Boolean param is passed, remove that specific HTMLElement from the DOM.
     *      - If the Boolean true is passed as the param, remove all children of the current element.
     *
     * Please note that since this method returns the object it's bound to to allow for method chaining,
     * the removed `HTMLElement` is not returned. Therefore, all removed elements are accessible via the
     * global `pete.garbage` cache by their id attribute values.
     *
     *      element.get('five').remove('two'); // Removes the element with the id 'two'.
     *      element.get('five').remove(true);  // Removes all children of element 'five'.
      *      // Later on in the code you need a reference to the removed element for whatever reason.
     *      const removedElement = pete.garbage['two'];
     */
    remove: function remove(elem) {
      var children, o;

      if (typeof elem === 'boolean' && elem) {
        children = this.dom.childNodes;

        for (var i = 0; children[i];) {
          // Remember a node list is a live list.
          children[i].parentNode.removeChild(children[i]);
        }
      } else {
        o = element.get(elem || this, true); //pete.garbage[o.id] = o.parentNode.removeChild(o);

        o.parentNode.removeChild(o);
      }

      return this;
    },

    /**
     * @function replaceClass
     * @param {String} newClass
     * @param {String} currentClass
     * @return {element}
     *
     * Swaps out the class or adds it if it doesn't exist.
     */
    replaceClass: function replaceClass(newClass, currentClass) {
      // Swap out the class or just add it if currentClass doesn't exist.
      if (this.hasClass(currentClass)) {
        this.dom.className = this.dom.className.replace(currentClass, newClass);
      } else {
        //this.dom.className += ' ' + newClass;
        this.addClass(newClass);
      }

      return this;
    },

    /**
     * @function removeClass
     * @param {String/Array} v
     * @return {element}
     *
     * Pass either one class or multiple classes as an array to be removed.
     */
    removeClass: function removeClass(v) {
      var dom = this.dom;
      v = Array.isArray(v) ? v : [v];

      for (var i = 0, len = v.length; i < len; i++) {
        if (this.hasClass(v[i])) {
          dom.className = dom.className.replace(v[i], '');
        }
      }

      return this;
    },

    /**
     * @function serialize
     * @param {None}
     * @return {String}
     *
     * Retrieves a form's `input`, `select` and `textarea` elements and gathers their values, delimiting them
     * by an ampersand into key-value pairs that can be then used in an HTTP POST method.
     */
    serialize: function serialize() {
      var arr = [];
      element.formElements(this).forEach(function (o) {
        outerLoop: switch (o.nodeName.toLocaleLowerCase()) {
          case 'input':
            switch (o.type) {
              case 'checkbox':
              case 'radio':
                if (!o.checked) {
                  break outerLoop;
                }

            }

          // Falls through.

          case 'select':
            if (o.type === 'select-multiple') {
              for (var i = 0, opts = o.options, len = opts.length; i < len; i++) {
                if (opts[i].selected) {
                  arr.push(encodeURIComponent(o.name) + '=' + encodeURIComponent(opts[i].value));
                }
              }

              break;
            }

          // Falls through.

          default:
            arr.push(encodeURIComponent(o.name) + '=' + encodeURIComponent(o.value));
        }
      });
      return arr.join('&');
    },

    /**
     * @function setStyle
     * @param {String/Object} prop
     * @param {String} value
     * @return {element}
     *
     * Pass either a single property and its corresponding value or a single argument that is an object of styles.
     */
    setStyle: function setStyle(prop, value) {
      if (typeof prop === 'string') {
        this.dom.style[prop] = value;
      } else if (prop.constructor === Object) {
        for (var _i = 0, _Object$keys = Object.keys(prop); _i < _Object$keys.length; _i++) {
          var i = _Object$keys[_i];
          this.dom.style[i] = prop[i];
        }
      }

      return this;
    },

    /**
     * @function show
     * @param {None}
     * @return {element}
     */
    show: function show() {
      this.dom.style.display = 'block';
      return this;
    },

    /**
     * @function textContent
     * @param {None}
     * @return {String}
     *
     * Uses either the Core DOM `textContent` property or Internet Explorer's proprietary
     * `innerText` property to retrieve all of the text nodes within an element node.
     */
    textContent: function textContent() {
      return document.addEventListener ? this.dom.textContent : this.dom.innerText;
    },

    /**
     * @function toggleClass
     * @param {String} classname
     * @return {element}
     *
     * Removes the class if the element already has it or adds it if it doesn't.
     */
    toggleClass: function toggleClass(classname) {
      if (this.hasClass(classname)) {
        this.removeClass(classname);
      } else {
        this.addClass(classname);
      }

      return this;
    },

    /**
     * @function trim
     * @param {String}
     * @return {String}
     *
     * Checks to see if the element is a text box. If it is, then it do a standard trim.
     */
    trim: function trim() {
      var dom = element.get(this, true);

      if (element.isTextBox(dom)) {
        dom.value = dom.value.trim();
      }

      return this;
    },

    /**
     * @function un
     * @param {String/Array} type The type of event
     * @param {Function} fn The callback function
     * @param {Boolean} useCapture Specify event phase (defaults to bubble)
     * @return {None}
     *
     * Unbinds one or more event listeners from the element and removes it/them from the cache.
     * If removing more than one type of event, pass the events as an array as the first argument.
     *
     *      // ...previous code...
     *      links.un('click', func);
     *
     *      - or -
     *
     *      links.un(['click', 'mouseover'], func);
     *
     */
    un: function un(type, fn, useCapture) {
      var _this = this;

      if (typeof type === 'string') {
        type = [type];
      }

      type.forEach(function (type) {
        _dom["default"].event.remove(_this.dom, type, fn, useCapture);

        delete _pete["default"].events[_this.dom._pete.ownerId][type];
      });
    },

    /**
     * @function value
     * @param {Mixed}
     * @return {element/Mixed}
     *
     * When acting as a getter, it will return the text content of the element (just the text, no HTML).
     * If operating on an `input` element, it will return the element's `value` property. When acting
     * as a setter, it will set the element's `innerHTML` property. If operating on an `input` element,
     * it will set the element's `value` property. Chaining is allowed when used as a setter.
     *
     *      element.gets("input").setStyle({background: "#CCC"}).value("test test i'm a test");
     *
     */
    value: function value(v) {
      if (v) {
        if (!element.isTextBox(this)) {
          this.dom.innerHTML = v;
        } else {
          this.dom.value = v;
        } // Allow for chaining.


        return this; // If getting, return the value.
      } else {
        return this.textContent() || this.dom.value;
      }
    },

    /**
     * @function element.get
     * @param {String/HTMLElement} elem Can be either the <code>id</code> of an existing element or a reference to an <code>HTMLElement</code>
     * @param {HTMLElement} root Optional, will default to <code>document</code>.
     * @param {Boolean} returnDOM Optional
     * @return {element/HTMLElement}
     *
     * Will only return a single element. This method accepts a CSS selector string. If multiple results are found, only the first is returned.
     * Returns an `element` wrapper. If `returnDOM` is `true`, returns an HTMLElement instead.
     */
    get: function () {
      var makeEl = function makeEl(dom, id) {
        var el; // We give up if the el doesn't have an id and there's no dom element in the document.

        if (!id && !dom) {
          return null;
        }

        id = id || dom._pete && dom._pete.ownerId; // See if el is cached. If so, we're done.
        // If not, create it and cache it.

        if (!(el = _pete["default"].cache[id])) {
          el = _peteCore.core.create(element, {
            dom: dom,
            id: id
          });
          id = el.id;
          _pete["default"].cache[id] = el; // Note that the _pete object will be stamped onto the HTMLElement in $compose if the
          // element is created with an HTMLElement.
          // Cache a data object on the HTMLElement where we can store internal library information.

          if (!dom._pete) {
            dom._pete = {};
          } // Cache the element id.


          dom._pete.ownerId = id;
        }

        return el;
      };

      return function (el, root, returnDOM) {
        var id, d;

        if (root && typeof root === 'boolean') {
          returnDOM = root;
          root = undefined;
        } // If it's an object we assume it's either an element or a HTMLElement.


        if (typeof el !== 'string') {
          // Exit if none of the above.
          if (!(d = _dom["default"].getDom(el, root))) {
            return null;
          } // We were passed an HTMLElement.


          if (d === el) {
            // If the element has the same id as its dom element, then it must have been given one by the dev.
            // Note that dom.id will be an empty string if not set.
            el = makeEl(d, d.id);
          } // We were passed an element.
          else {
            id = el.id; // If it's not in the cache do so now.
            // Note that elements created directly (core.create) aren't put in the cache by default.

            if (!_pete["default"].cache[id]) {
              // Ensure it has an id.
              id = id || _pete["default"].id();
              _pete["default"].cache[id] = el;
            }
          }
        } else {
          if (reDomId.test(el)) {
            // Note el will refer to a DOM id.
            // If we've gotten here and the el arg is an HTMLElement, we can safely assume that it has a valid id
            // since we've now determined that the passed string is a DOM id.
            //
            // If the element has the same id as its dom element, then it must have been given one by the dev.
            if (!(el = makeEl(_dom["default"].getDom(el, root), el))) {
              return null;
            }
          } else {
            // This allows for passing a selector to the domQuery engine (via element.gets).
            // Pass along a third argument in case root is also passed.
            //
            // TODO: Using element.get here causes a Too Much Recursion error.
            // Note we don't cache composite objects!
            el = _peteCore.core.create(element, {
              dom: element.gets(el, root || true, true)[0]
            });
          }
        }

        return returnDOM ? el.dom : el;
      };
    }(),

    /**
     * @function gets
     * @param {String} selector
     * @param {HTMLElement} root Optional, will default to <code>document</code>.
     * @param {Boolean} returnDOM Optional
     * @return {composite/Array}
     *
     * Pass a selector as well as an optional context element. Returns an element wrapper.
     * If `returnDOM` is `true`, returns an HTMLElement.
     *
     * Uses the Selectors API (https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector).
     *
     *      const list = element.gets('div div#theDiv.foobar .foo');
     *      list.addClass('bar');
     *
     */
    gets: function gets(selector, root, returnDOM) {
      var a = [];
      var els;

      if (root && typeof root === 'boolean') {
        returnDOM = root;
        root = document;
      } // Some older browsers don't support the Selectors API and the Selectors API doesn't support negative
      // attribute selectors, i.e. #myElem[class!=foo].


      if (selector.indexOf('!') !== -1 || typeof document.querySelectorAll !== 'function') {
        els = _pete["default"].domQuery.search(selector, root); //returns a live HTML collection;
      } else {
        // Use the Selectors API, it's faster and returns a static nodelist.
        els = (root || document).querySelectorAll(selector);
      } // TODO: make an array?


      for (var i = 0, len = els.length; i < len; i++) {
        a.push(els[i]);
      }

      return returnDOM ? a : _peteCore.core.create(_composite["default"], {
        elements: a
      });
    }
  };
}());

var _default = element;
exports["default"] = _default;
},{"./composite":5,"./dom":6,"./pete":9,"pete-core":2}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "ajax", {
  enumerable: true,
  get: function get() {
    return _ajax["default"];
  }
});
Object.defineProperty(exports, "composite", {
  enumerable: true,
  get: function get() {
    return _composite["default"];
  }
});
Object.defineProperty(exports, "dom", {
  enumerable: true,
  get: function get() {
    return _dom["default"];
  }
});
Object.defineProperty(exports, "element", {
  enumerable: true,
  get: function get() {
    return _element["default"];
  }
});
Object.defineProperty(exports, "pete", {
  enumerable: true,
  get: function get() {
    return _pete["default"];
  }
});
Object.defineProperty(exports, "template", {
  enumerable: true,
  get: function get() {
    return _template["default"];
  }
});
Object.defineProperty(exports, "util", {
  enumerable: true,
  get: function get() {
    return _util["default"];
  }
});

var _pete = _interopRequireDefault(require("./pete"));

var _ajax = _interopRequireDefault(require("./ajax"));

var _composite = _interopRequireDefault(require("./composite"));

var _dom = _interopRequireDefault(require("./dom"));

var _element = _interopRequireDefault(require("./element"));

var _template = _interopRequireDefault(require("./template"));

var _util = _interopRequireDefault(require("./util"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }
},{"./ajax":4,"./composite":5,"./dom":6,"./element":7,"./pete":9,"./template":10,"./util":11}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _peteCore = require("pete-core");

var _util = _interopRequireDefault(require("./util"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Copyright (c) 2009 - 2018 Benjamin Toll (benjamintoll.com)
 *
 * This file is part of pete-dom.
 *
 * pete-dom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pete-dom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with pete-dom.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
var pete = {
  /**
   * @property globalSymbol
   * @type String
   *
   * Constant. The global symbol that is used in everything from the creation of unique `Element` ids to class names.
   */
  globalSymbol: 'Pete',
  id: function id() {
    return "".concat(pete.globalSymbol).concat(_util["default"].increment());
  },
  wrap: function wrap(proto, method) {
    if (!proto[method]) {
      proto[method] = function () {
        return this.invoke(method, arguments);
      };
    }
  },

  /**
   * @property tags
   * @type RegExp
   *
   * This contains all possible HTML tags. Is used by `domQuery` and `get.dom`. Is used internally but can be overwritten for any custom needs.
   */
  tags: /^(?:\*|a|abbr|acronym|address|applet|area|b|base|basefont|bdo|big|blockquote|body|br|button|caption|center|cite|code|col|colgroup|dd|del|dfn|dir|div|dl|dt|em|fieldset|font|footer|form|frame|frameset|h1|h2|h3|h4|h5|h6|head|header|hr|html|i|iframe|img|input|ins|isindex|kbd|label|legend|li|link|map|menu|meta|noframes|noscript|object|ol|optgroup|option|p|param|pre|q|s|samp|script|section|select|small|span|strike|strong|style|sub|sup|table|tbody|td|textarea|tfoot|th|thead|title|tr|tt|u|ul|var)$/i
};
var ua = navigator.userAgent.toLocaleLowerCase();
var isStrict = document.compatMode === 'CSS1Compat';
var isOpera = ua.indexOf('opera') > -1;
var isSafari = /webkit|khtml/.test(ua);
var isSafari3 = isSafari && ua.indexOf('webkit/5') !== -1;
var isiPhone = ua.indexOf('iphone') > -1; //const isIE = /*@cc_on!@*/false; //IE conditional compilation;

var isIE = !isOpera && ua.indexOf('msie') > -1;
var isIE6 = !isOpera && ua.indexOf('msie 6') > -1;
var isIE7 = !isOpera && ua.indexOf('msie 7') > -1;
var isIE8 = !isOpera && ua.indexOf('msie 8') > -1;

_peteCore.core.mixin(pete, {
  /**
  * @property isStrict
  * @type Boolean
  */
  isStrict: isStrict,

  /**
  * @property isOpera
  * @type Boolean
  */
  isOpera: isOpera,

  /**
  * @property isSafari
  * @type Boolean
  */
  isSafari: isSafari,

  /**
  * @property isSafari3
  * @type Boolean
  */
  isSafari3: isSafari3,

  /**
  * @property isiPhone
  * @type Boolean
  */
  isiPhone: isiPhone,

  /**
  * @property isIE
  * @type Boolean
  */
  isIE: isIE,

  /**
  * @property isIE6
  * @type Boolean
  */
  isIE6: isIE6,

  /**
  * @property isIE7
  * @type Boolean
  */
  isIE7: isIE7,

  /**
  * @property isIE8
  * @type Boolean
  */
  isIE8: isIE8
});

_peteCore.core.mixin(pete, {
  cache: {},
  disabled: {},
  events: {},
  garbage: {}
});

var _default = pete;
exports["default"] = _default;
},{"./util":11,"pete-core":2}],10:[function(require,module,exports){
/**
 * Copyright (c) 2009 - 2018 Benjamin Toll (benjamintoll.com)
 *
 * This file is part of pete-dom.
 *
 * pete-dom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pete-dom is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with pete-dom.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _peteCore = require("pete-core");

var _dom = _interopRequireDefault(require("./dom"));

var _element = _interopRequireDefault(require("./element"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * @function Template
 * @param {String} html A tokenized string of HTML that will define the template
 * @return {None}
 */
var template = {
  /**
   * @property re
   * @type RegExp
   * Constant. The regular expression against which the Template is applied.
   */
  re: /\{(\w+)\}/g,
  $extend: function $extend() {
    var html = this.html;

    if (Array.isArray(html)) {
      this.html = html.join('');
    }
  },

  /**
   * @function append
   * @param {HTMLElement/element} elem
   * @param {Object/Array} values An object literal or an array, will contain a map for the tokens
   * @return {None}
   *
   * Appends the Template to the element referenced by `elem`. `values` will contain a map for the tokens.
   */
  append: function append(elem, values) {
    _dom["default"].insertHtml('beforeEnd', _element["default"].get(elem, true), _peteCore.core.mixin(values));
  },

  /**
   * @function apply
   * @param {Object/Array} values An object literal token map or an array
   * @return {String}
   *
   * Returns the Template (a String) with the values specified by values for the tokens.
   */
  apply: function apply(values) {
    return this.html.replace(this.re, function (a, b) {
      return values[b];
    });
  }
};
var _default = template;
exports["default"] = _default;
},{"./dom":6,"./element":7,"pete-core":2}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _pete = _interopRequireDefault(require("./pete"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

/**
 * Copyright (c) 2009 - 2018 Benjamin Toll (benjamintoll.com)
 *
 * This file is part of pete-dom.
 *
 * pete-dom is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * pete-core is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with pete-dom.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
var reAddCommas = /(\d+)(\d{3})/;
var reCamelCase = /([a-zA-Z0-9])([a-zA-Z0-9]*)[_|\-|\.|\s]([a-zA-Z0-9])/g; // Replace all . or _ or - with a space and then capitalize the first letter of each word.

var reCapFirstLetter = /[\s|_|\-|\.](\w)/g;
var reRange = /(\-?\w+)(\.{2,3})(\-?\w+)/; // For internal use only, can be modified via Pete#flush.

var cache = {};
var disabled = {};
var events = {};
var garbage = {};
var util = {
  /**
   * @function Pete.core.util.addCommas
   * @param {Number/String} format The number to be formatted with commas.
   * @return {String}
   *
   * Accepts a `Number` or a `String` and formats it with commas, i.e. `3,456,678`.
   *
   * Note that it's returned as a `String` because it may contain a comma and `parseInt()`
   * gives up when it sees a character that doesn't evaluate to a number.
   */
  addCommas: function addCommas(format) {
    var str = format + '';

    while (reAddCommas.test(str)) {
      str = str.replace(reAddCommas, '$1,$2');
    } // Can't return as a number b/c it could contain commas and parseInt() gives up when it sees a comma.


    return str;
  },

  /**
   * @function Pete.core.util.camelCase
   * @param {String} str
   * @return {String}
   *
   * Searches the `String` for an instance of a period (.), underscore (_), whitespace ( ) or hyphen (-)
   * in a word and removes it, capitalizing the first letter of the joined text.
   *
   *      document.write('This old Farm.land Boy-oh_boy'.camelCase());
   *      // This old farmLand boyOhBoy
   *
   */
  camelCase: function camelCase(str) {
    return str.replace(reCamelCase, function (a, b, c, d) {
      return b.toLocaleLowerCase() + c + d.toLocaleUpperCase();
    });
  },

  /**
   * @function Pete.core.util.capFirstLetter
   * @param {String} str
   * @return {String}
   *
   * Replaces every period (.), underscore (_) and hyphen (-) with a space ( ) and then capitalizes the first letter of each word.
   */
  capFirstLetter: function capFirstLetter(str) {
    str = str.replace(reCapFirstLetter, function (a, b) {
      return " ".concat(b.toLocaleUpperCase());
    });
    return str.charAt(0).toLocaleUpperCase() + str.slice(1);
  },

  /**
   * @function Pete.core.util.flush
   * @param {Array/String} action Function argument(s) can be an `Array` or one or more `Strings`
   * @return {None}
   *
   *
   *       `cache` - clear the cache of any `Pete.Elements`
   *       `disabled` - re-enable any disabled elements
   *       `flyweight` - clear the flyweight object
   *       `garbage` - clear the garbage cache of any `HTMLElements` that were removed from the DOM
   *
   */
  flush: function flush() {
    if (!arguments.length) {
      return;
    }

    for (var i = 0, len = arguments.length; i < len; i++) {
      switch (i < 0 || arguments.length <= i ? undefined : arguments[i]) {
        case 'cache':
          cache = {};
          break;

        case 'disabled':
          if (!util.isEmpty(disabled)) {
            disabled = {};
          }

          break;

        /*
        case 'flyweight':
            flyweight = {};
            break;
        */

        case 'garbage':
          garbage = {};
      }
    }
  },

  /**
   * @function getX
   * @param {EventObject} e
   * @return {Number}
   *
   * Returns the X coordinate of the queried element in the viewport.
   */
  getX: function getX(e) {
    // Check for the non-IE position, then the IE position.
    return e.pageX || e.clientX + document.body.scrollLeft;
  },

  /**
   * @function getY
   * @param {EventObject} e
   * @return {Number}
   *
   * Returns the Y coordinate of the queried element in the viewport.
   */
  getY: function getY(e) {
    // Check for the non-IE position, then the IE position.
    return e.pageY || e.clientY + document.body.scrollTop;
  },

  /**
   * @function Pete.core.util.howMany
   * @param {String} haystack The string to search
   * @param {String} needle The part to search for
   * @return {Number}
   *
   * Returns how many times `needle` occurs in the given `haystack`.
   */
  howMany: function howMany(haystack, needle) {
    var i = 0;
    var pos = haystack.indexOf(needle);

    while (pos > -1) {
      pos = haystack.indexOf(needle, pos + 1);
      i++;
    }

    return i;
  },

  /**
   * @function Pete.core.util.increment
   * @param {None}
   * @return {Number}
   */
  increment: function () {
    var n = 0;
    return function () {
      return n++;
    };
  }(),

  /**
   * @function Pete.core.util.isEmpty
   * @param {Mixed} v
   * @return {Boolean}
   *
   * Tests if the variable is empty. `null`, `undefined` and `NaN` are considered to be empty values.
   */
  isEmpty: function isEmpty(v) {
    var empty = true;

    if (typeof v === 'string' && v.length > 0 || typeof v === 'number' && !isNaN(v) || // We need a type assertion here b/c TypeScript cannot determine the type passed to `this.isArray`.
    Array.isArray(v) && v.length > 0 || v instanceof Object && Object.keys(v).length || v instanceof Date) {
      empty = false;
    }

    return empty;
  },

  /**
   * @function Pete.core.util.makeId
   * @param {None}
   * @return {String}
   *
   * Creates an `element` a unique ID if it doesn't already have one.
   */
  makeId: function makeId() {
    return _pete["default"].globalSymbol + util.increment();
  },

  /**
   * @function Pete.core.util.range
   * @param {String} range
   * @return {Array}
   *
   * Inspired by Ruby's `range` method. Since this method is based on Ruby's implementation, the syntax and
   * functionality is very similar. This method will return both numeric and alphabetical arrays. The beginning
   * range element must always be smaller than the ending range element. Note that even though numeric ranges
   * are passed to the method as a string data type, i.e., "1..100", the array returned will contain numeric
   * elements. Alphabetical ranges will of course return an array of strings.
   *
   * Just as in Ruby, the ".." range is inclusive, while the "..." range is exclusive.
   *
   *      util.range('-52..-5');  // Returns an array containing elements -52 through -5, including -5.
   *      util.range('-52...-5'); // Returns an array containing elements -52 through -5, excluding -5.
   *      util.range('-5..-52');  // Throws an exception.
   *      util.range('a..z');     // Returns an array containing elements 'a' through 'z', including 'z'.
   *      util.range('A...Z');    // Returns an array containing elements 'A' through 'Z', excluding 'Z'.
   *      util.range('E..A');     // Throws an exception.
   *
   * Example:
   *
   *      const temp = 72;
   *
   *      switch (true) {
   *          case Pete.range('-30..-1').contains(temp):
   *          console.log('Sub-freezing');
   *          break;
   *
   *          case Pete.range('0..32').contains(temp):
   *              console.log('Freezing');
   *              break;
   *
   *          case Pete.range('33..65').contains(temp):
   *              console.log('Cool');
   *              break;
   *
   *          case Pete.range('66..95').contains(temp):
   *              console.log('Balmy');
   *              break;
   *
   *          case Pete.range('96..120').contains(temp):
   *              console.log('Hot, hot, hot!');
   *              break;
   *
   *          default:
   *              console.log('You must be very uncomfortable, wherever you are!');
   *      }
   *
   *      // Logs 'Balmy'.
   *
   *
   * Another example:
   *
   *      // Create and return the alphabet as a string.
   *      util.range("A..Z").join("");
   *
   */
  range: function range(_range) {
    var arr = [];
    var chunks = reRange.exec(_range);
    var isNumeric = chunks[1] === '0' || !!Number(chunks[1]);

    if (reRange.test(_range)) {
      var begin, end; // NOTE !!(Number("0") evaluates to falsy for numeric ranges so specifically
      // check for this condition.
      // Re-assign the value of range to the actual range, i.e., ".." or "...".

      _range = chunks[2]; // If it's a numeric range cast the string into a number else get the Unicode
      // value of the letter for alpha ranges.

      begin = isNumeric ? Number(chunks[1]) : chunks[1].charCodeAt();
      end = isNumeric ? Number(chunks[3]) : chunks[3].charCodeAt(); // Establish some exceptions.

      if (begin > end) {
        throw new Error('The end range cannot be smaller than the start range.');
      }

      if (isNumeric && end - begin > 1000) {
        throw new Error('The range is too large, please narrow it.');
      }

      for (var i = 0; begin <= end; i++, begin++) {
        // If it's an alphabetical range then turn the Unicode value into a string
        // (number to a string).
        arr[i] = isNumeric ? begin : String.fromCharCode(begin);
      }

      if (_range === '...') {
        // If the range is exclusive, lop off the last index.
        arr.splice(-1);
      }
    }

    return arr;
  }
};
var _default = util;
exports["default"] = _default;
},{"./pete":9}],12:[function(require,module,exports){
"use strict";

var _peteDom = require("pete-dom");

// Gather the note names that will be used to build the dom elements.
const notes = []; // Holds the permutations.

const quizzes = [];
const notesObj = {
  'Ionian': ['1', '2', '3', '4', '5', '6', '7'],
  'Dorian': ['1', '2', '&#9837;3', '4', '5', '6', '&#9837;7'],
  'Phrygian': ['1', '&#9837;2', '&#9837;3', '4', '5', '&#9837;6', '&#9837;7'],
  'Lydian': ['1', '2', '3', '&#9839;4', '5', '6', '7'],
  'Mixolydian': ['1', '2', '3', '4', '5', '6', '&#9837;7'],
  'Aeolian': ['1', '2', '&#9837;3', '4', '5', '&#9837;6', '&#9837;7'],
  'Locrian': ['1', '&#9837;2', '&#9837;3', '4', '&#9837;5', '&#9837;6', '&#9837;7']
};

const random = () => Math.round(Math.random()) - 0.5; // Collect all of the arrays from within the notesObj object.


const getArrays = () => {
  for (let prop of Object.keys(notesObj)) {
    // Get each note to use later when we build the dom elements.
    notes.push(prop);
    quizzes.push(notesObj[prop]);
    quizzes.sort(random);
  } // Randomize them.
  // notes.sort(random);

};

let n = 0; // Get the current chord to display to the user.

const getChord = () => {
  if (n === notes.length) {
    n = 0;
  } // Pete.getDom("currentChordInterval").innerHTML = "<span>" + notesObj[notes[n]].join("</span><span>");
  // Pete.getDom("currentChordInterval").currentChordInterval = notesObj[notes[n]]; //we need to attach the array to an expando property since we need another way of comparing than the value of the currentChord dom element (since the browser converts the entity when displaying it and it no longer matches the entity when comparing the values in the event handler);


  _peteDom.dom.getDom('currentChordInterval').innerHTML = '<span>' + quizzes[n].join('</span><span>'); // We need to attach the array to an expando property since we need another way of comparing than
  // the value of the currentChord dom element (since the browser converts the entity when displaying
  // it and it no longer matches the entity when comparing the values in the event handler).

  _peteDom.dom.getDom('currentChordInterval').currentChordInterval = quizzes[n];
  n++;
};

getArrays();

_peteDom.dom.ready(() => {
  _peteDom.dom.create({
    tag: 'div',
    id: 'chordIntervalsQuiz',
    items: [{
      tag: 'div',
      items: [{
        tag: 'h3',
        attr: {
          'innerHTML': 'Guess the mode'
        }
      }, {
        tag: 'p',
        attr: {
          'innerHTML': 'Modes'
        }
      }, {
        tag: 'div',
        id: 'currentChordInterval',
        attr: {
          'className': 'clearfix'
        }
      }]
    }, {
      tag: 'div',
      items: [{
        tag: 'div',
        id: 'chordIntervals',
        attr: {
          'className': 'clearfix'
        }
      }]
    }],
    parent: document.body
  });

  for (let i = 0, len = notes.length; i < len; i++) {
    _peteDom.dom.create({
      tag: 'a',
      attr: {
        href: '#'
      },
      items: [{
        tag: 'span',
        attr: {
          innerHTML: notes[i],
          // Bind an expando property for when comparing values in the event handler.
          note: notes[i]
        }
      }],
      parent: _peteDom.dom.getDom('chordIntervals')
    });
  } // Note we're only binding one event listener for the entire page (because of this make sure each
  // <span> entirely covers each <a>).


  _peteDom.element.fly('chordIntervals').on('click', e => {
    const target = e.target;
    let note;

    if (target.nodeName === 'SPAN') {
      note = target.note;

      if (notesObj[note] === _peteDom.dom.getDom('currentChordInterval').currentChordInterval) {
        alert('Correct');
        getChord();
      } else {
        alert('Incorrect');
      }
    }

    e.preventDefault();
  }); // Initialize.


  getChord();
});


},{"pete-dom":8}]},{},[12]);
