/**
 * Created by Rain on 2016/12/8.
 */
var merge = require('utils-merge');
var cookie = require('cookie');

var Cookie = module.exports = function Cookie(options) {
  this.path = '/';
  this.maxAge = null;
  this.httpOnly = true; // 禁止客户端修改 cookie
  if (options) merge(this, options);
  this.originalMaxAge = undefined == this.originalMaxAge
      ? this.maxAge
      : this.originalMaxAge;
};

Cookie.prototype = {

  /**
   * Set expires `date`.
   * 设置过期事件
   * @param {Date} date
   * @api public
   */
  set expires(date) {
    this._expires = date;
    this.originalMaxAge = this.maxAge;
  },

  /**
   * Get expires `date`.
   * 获取当前cookie过期时间
   * @return {Date}
   * @api public
   */
  get expires() {
    return this._expires;
  },

  /**
   * Set expires via max-age in `ms`.
   *
   * @param {Number} ms
   * @api public
   */
  set maxAge(ms) {
    this.expires = 'number' == typeof ms
        ? new Date(Date.now() + ms)
        : ms;
  },

  /**
   * Get expires max-age in `ms`.
   *
   * @return {Number}
   * @api public
   */
  get maxAge() {
    return this.expires instanceof Date
        ? this.expires.valueOf() - Date.now()
        : this.expires;
  },

  /**
   * Return cookie data object.
   *
   * @return {Object}
   * @api private
   */
  get data() {
    return {
      originalMaxAge: this.originalMaxAge
      , expires: this._expires
      , secure: this.secure
      , httpOnly: this.httpOnly
      , domain: this.domain
      , path: this.path
      , sameSite: this.sameSite
    }
  },

  /**
   * Return a serialized cookie string.
   * 返回序列化的cookie的字符串
   * @return {String}
   * @api public
   */
  serialize: function (name, val) {
    return cookie.serialize(name, val, this.data);
  },

  /**
   * Return JSON representation of this cookie.
   * 返回json 表示的cookie
   * @return {Object}
   * @api private
   */
  toJSON: function () {
    return this.data;
  }
};






