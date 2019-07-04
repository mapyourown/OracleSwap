"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var If = function If(props) {
  return props.condition ? props.render ? props.render() : props.children : null;
};

If.propTypes = {
  condition: _propTypes.default.bool.isRequired,
  children: _propTypes.default.node,
  render: _propTypes.default.func
};
var _default = If;
exports.default = _default;