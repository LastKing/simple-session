/**
 * Created by Rain on 2016/12/8.
 */
var util = require('util');

var Store = require('./store');

/**  Shim setImmediate for node.js < 0.10 */
var defer =
  typeof setImmediate === 'function' ? setImmediate : function fn(fn) {
    process.nextTick(fn.bind.apply(fn, arguments))
  };

module.exports = MemoryStore;

function MemoryStore() {
  Store.call(this);
  this.sessions = Object.create(null);
}
util.inherits(MemoryStore, Store);

/**
 * Get all active sessions. （获取所有 活动session，猜测：这里是过滤，那些有sessionId，无session的值）
 */
MemoryStore.prototype.all = function all(callback) {
  var sessionIds = Object.keys(this.sessions);
  var sessions = Object.create(null);

  for (var i = 0; i < sessionIds.length; i++) {
    var sessionId = sessionIds[i];
    var session = getSession.call(this, sessionId);

    if (session) {
      sessions[sessionId] = session;
    }
  }
  callback && defer(callback, null, sessions);
};

/**
 * Clear all sessions.
 */
MemoryStore.prototype.clear = function (callback) {
  this.sessions = Object.create(null);
  callback && defer(callback);
};

/**
 * Destroy the session associated with the given session ID.
 */
MemoryStore.prototype.destroy = function (sessionId, callback) {
  delete this.sessions[sessionId];
  callback && defer(callback);
};

/**
 * Fetch session by the given session ID.
 */

MemoryStore.prototype.get = function get(sessionId, callback) {
  defer(callback, null, getSession.call(this, sessionId));
};

/**
 * Commit the given session associated with the given sessionId to the store.
 */

MemoryStore.prototype.set = function set(sessionId, session, callback) {
  this.sessions[sessionId] = JSON.stringify(session);
  callback && defer(callback)
};

/**
 * Get number of active sessions.
 */

MemoryStore.prototype.length = function length(callback) {
  this.all(function (err, sessions) {
    if (err) return callback(err);
    callback(null, Object.keys(sessions).length)
  })
};

/**
 * Touch the given session object associated with the given session ID.
 *
 */
MemoryStore.prototype.touch = function touch(sessionId, session, callback) {
  var currentSession = getSession.call(this, sessionId);//根据sessionID获取session

  if (currentSession) {
    // update expiration（更新session 过期事件）
    currentSession.cookie = session.cookie;
    this.sessions[sessionId] = JSON.stringify(currentSession);//JSON字符串化
  }

  callback && defer(callback)
};

/**
 * Get session from the store.
 * @private
 */
function getSession(sessionId) {
  var sess = this.sessions[sessionId];//根据sesionId 从 session组中获取session

  if (!sess) { //不存在则返回
    return;
  }

  //JSON话session ，因为session存储都是用的字符串（redis里面用的字符串格式，应该都是这样通用的）
  sess = JSON.parse(sess);

  //获取过期时间戳
  var expires = typeof sess.cookie.expires === 'string'
    ? new Date(sess.cookie.expires)
    : sess.cookie.expires;

  // destroy expired session （销毁过期session）
  if (expires && expires <= Date.now()) {
    delete this.sessions[sessionId];
    return
  }

  return sess
}
