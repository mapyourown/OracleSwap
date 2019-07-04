"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _react = _interopRequireDefault(require("react"));

var _propTypes = _interopRequireDefault(require("prop-types"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var For = function For(_ref) {
  var render = _ref.render,
      of = _ref.of;
  return of.map(function (item, index) {
    return render(item, index);
  });
};

For.propTypes = {
  of: _propTypes.default.array.isRequired,
  render: _propTypes.default.func.isRequired
};
var _default = For;
exports.default = _default;