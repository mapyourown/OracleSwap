"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

var _if = _interopRequireDefault(require("./if"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var Choose = function Choose(props) {
  var when = null;
  var otherwise = null;

  _react.default.Children.forEach(props.children, function (children) {
    if (children.props.condition === undefined) {
      otherwise = children;
    } else if (!when && children.props.condition === true) {
      when = children;
    }
  });

  return when || otherwise;
};

Choose.propTypes = {
  children: _propTypes.default.node
};
Choose.When = _if.default;

Choose.Otherwise = function (_ref) {
  var render = _ref.render,
      children = _ref.children;
  return render ? render() : children;
};

Choose.Otherwise.propTypes = {
  children: _propTypes.default.node,
  render: _propTypes.default.func
};
var _default = Choose;
exports.default = _default;