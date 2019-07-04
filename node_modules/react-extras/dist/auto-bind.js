// From https://github.com/sindresorhus/auto-bind/blob/master/index.js
// Bundled because of Create React App…
'use strict'; // Gets all non-builtin properties up the prototype chain

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var getAllProperties = function getAllProperties(object) {
  var props = new Set();

  do {
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
      for (var _iterator = Reflect.ownKeys(object)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
        var key = _step.value;
        props.add([object, key]);
      }
    } catch (err) {
      _didIteratorError = true;
      _iteratorError = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion && _iterator.return != null) {
          _iterator.return();
        }
      } finally {
        if (_didIteratorError) {
          throw _iteratorError;
        }
      }
    }
  } while ((object = Reflect.getPrototypeOf(object)) && object !== Object.prototype);

  return props;
};

module.exports = function (self, options) {
  options = Object.assign({}, options);

  var filter = function filter(key) {
    var match = function match(pattern) {
      return typeof pattern === 'string' ? key === pattern : pattern.test(key);
    };

    if (options.include) {
      return options.include.some(match);
    }

    if (options.exclude) {
      return !options.exclude.some(match);
    }

    return true;
  };

  var _iteratorNormalCompletion2 = true;
  var _didIteratorError2 = false;
  var _iteratorError2 = undefined;

  try {
    for (var _iterator2 = getAllProperties(self.constructor.prototype)[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
      var _step2$value = _slicedToArray(_step2.value, 2),
          object = _step2$value[0],
          key = _step2$value[1];

      if (key === 'constructor' || !filter(key)) {
        continue;
      }

      var descriptor = Reflect.getOwnPropertyDescriptor(object, key);

      if (descriptor && typeof descriptor.value === 'function') {
        self[key] = self[key].bind(self);
      }
    }
  } catch (err) {
    _didIteratorError2 = true;
    _iteratorError2 = err;
  } finally {
    try {
      if (!_iteratorNormalCompletion2 && _iterator2.return != null) {
        _iterator2.return();
      }
    } finally {
      if (_didIteratorError2) {
        throw _iteratorError2;
      }
    }
  }

  return self;
};

var excludedReactMethods = ['componentWillMount', 'UNSAFE_componentWillMount', 'render', 'getSnapshotBeforeUpdate', 'componentDidMount', 'componentWillReceiveProps', 'UNSAFE_componentWillReceiveProps', 'shouldComponentUpdate', 'componentWillUpdate', 'UNSAFE_componentWillUpdate', 'componentDidUpdate', 'componentWillUnmount', 'componentDidCatch', 'setState', 'forceUpdate'];

module.exports.react = function (self, options) {
  options = Object.assign({}, options);
  options.exclude = (options.exclude || []).concat(excludedReactMethods);
  return module.exports(self, options);
};