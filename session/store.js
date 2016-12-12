/**
 * Created by Rain on 2016/12/8.
 */
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var Cookie = require('./cookie');
var Session = require('./session');

module.exports = Store;

function Store() {
  EventEmitter.call(this);
}

util.inherits(Store, EventEmitter);

Store.prototype.regenerate = function (req, callback) {
  var self = this;
  this.destroy(req.sessionId, function (err) {
    self.generate(req);
    callback(err);
  })
};

Store.prototype.load = function (sid, fn) {
  var self = this;

  this.get(sid, function (err, sess) {
    if (err) return fn(err);
    if (!sess) return fn();
    var req = {sessionID: sid, sessionStore: self};
    fn(null, self.createSession(req, sess));
  })
};

/**
 * Create session from JSON `sess` data.
 * 根据JSON格式的sess 数据 创建一个session
 * @param {IncomingRequest} req
 * @param {Object} sess
 * @return {Session}
 * @api private
 */
Store.prototype.createSession = function (req, sess) {
  var expires = sess.cookie.expires;    //cookie 过期时间
  var orig = sess.cookie.originalMaxAge;//cookie 最大数

  sess.cookie = new Cookie(sess.cookie);//根据session中cookie创建一个session
  if ('string' == typeof expires) sess.cookie.expires = new Date(expires);//格式化 过期时间
  sess.cookie.originalMaxAge = orig;
  req.session = new Session(req, sess);
  return req.session;
};
