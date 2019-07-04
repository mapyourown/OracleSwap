"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "autoBind", {
  enumerable: true,
  get: function get() {
    return _autoBind.react;
  }
});
Object.defineProperty(exports, "classNames", {
  enumerable: true,
  get: function get() {
    return _classNames.default;
  }
});
Object.defineProperty(exports, "If", {
  enumerable: true,
  get: function get() {
    return _if.default;
  }
});
Object.defineProperty(exports, "Choose", {
  enumerable: true,
  get: function get() {
    return _choose.default;
  }
});
Object.defineProperty(exports, "For", {
  enumerable: true,
  get: function get() {
    return _for.default;
  }
});
Object.defineProperty(exports, "Image", {
  enumerable: true,
  get: function get() {
    return _image.default;
  }
});
Object.defineProperty(exports, "RootClass", {
  enumerable: true,
  get: function get() {
    return _rootClass.default;
  }
});
Object.defineProperty(exports, "BodyClass", {
  enumerable: true,
  get: function get() {
    return _bodyClass.default;
  }
});
exports.canUseDOM = exports.getDisplayName = exports.isStatelessComponent = void 0;

var _autoBind = require("./auto-bind");

var _classNames = _interopRequireDefault(require("./class-names"));

var _if = _interopRequireDefault(require("./if"));

var _choose = _interopRequireDefault(require("./choose"));

var _for = _interopRequireDefault(require("./for"));

var _image = _interopRequireDefault(require("./image"));

var _rootClass = _interopRequireDefault(require("./root-class"));

var _bodyClass = _interopRequireDefault(require("./body-class"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isStatelessComponent = function isStatelessComponent(Component) {
  return !(typeof Component.prototype !== 'undefined' && typeof Component.prototype.render === 'function');
};

exports.isStatelessComponent = isStatelessComponent;

var getDisplayName = function getDisplayName(Component) {
  return Component.displayName || Component.name || 'Component';
};

exports.getDisplayName = getDisplayName;
var canUseDOM = typeof window !== 'undefined' && 'document' in window && 'createElement' in window.document;
exports.canUseDOM = canUseDOM;