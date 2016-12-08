/**
 * Created by Rain on 2016/12/8.
 */
var cookie = require('cookie');
var crc = require('crc').crc32;
var uid = require('uid-safe').sync;
var debug = require('debug')('express-session');
var deprecate = require('depd')('express-session');
var parseUrl = require('parseurl');
var onHeaders = require('on-headers');
var signature = require('cookie-signature');

// environment
var env = process.env.NODE_ENV;

var Session = require('./session/session');
var MemoryStore = require('./session/memory');
var Cookie = require('./session/cookie');
var Store = require('./session/store');

exports = module.exports = session;

module.exports.Store = Store;
module.exports.Cookie = Cookie;
module.exports.Session = Session;
module.exports.MemoryStore = MemoryStore;

/**
 * Warning message for `MemoryStore` usage in production.
 * @private
 */
var warning = 'Warning: connect.session() MemoryStore is not\n'
    + 'designed for a production environment, as it will leak\n'
    + 'memory, and will not scale past a single process.';

/* istanbul ignore next */
var defer = typeof setImmediate === 'function'
    ? setImmediate
    : function (fn) {
  process.nextTick(fn.bind.apply(fn, arguments))
};


/**
 * Setup session store with the given `options`.
 *
 * @param {Object} [options]
 * @param {Object} [options.cookie] Options for cookie
 * @param {Function} [options.genid]
 * @param {String} [options.name=connect.sid] Session ID cookie name
 * @param {Boolean} [options.proxy]
 * @param {Boolean} [options.resave] Resave unmodified sessions back to the store
 * @param {Boolean} [options.rolling] Enable/disable rolling session expiration
 * @param {Boolean} [options.saveUninitialized] Save uninitialized sessions to the store
 * @param {String|Array} [options.secret] Secret for signing session ID
 * @param {Object} [options.store=MemoryStore] Session store
 * @param {String} [options.unset]
 * @return {Function} middleware
 * @public
 */
function session(options) {
  var opts = options || {};

  // get the cookie options
  var cookieOptions = opts.cookie || {};

  // get the session id generate function （sessionId生成方式，默认uid）
  var generateId = opts.genid || generateSessionId;

  // get the session cookie name （获取cookie的name ，用于以后分析）
  var name = opts.name || opts.key || 'connect.sid';

  // get the session store（获取session 的存储引擎，默认为内存存储）
  var store = opts.store || new MemoryStore();

// get the trust proxy setting
  var trustProxy = opts.proxy;

  // get the resave session option
  var resaveSession = opts.resave;

  // get the rolling session option
  var rollingSessions = Boolean(opts.rolling);

  // get the save uninitialized session option
  var saveUninitializedSession = opts.saveUninitialized;

  // get the cookie signing secret
  var secret = opts.secret;

  if (typeof generateId !== 'function') {
    throw new TypeError('genid option must be a function');
  }

  if (resaveSession === undefined) {
    deprecate('undefined resave option; provide resave option');
    resaveSession = true;
  }

  if (saveUninitializedSession === undefined) {
    deprecate('undefined saveUninitialized option; provide saveUninitialized option');
    saveUninitializedSession = true;
  }

  if (opts.unset && opts.unset !== 'destroy' && opts.unset !== 'keep') {
    throw new TypeError('unset option must be "destroy" or "keep"');
  }

  // TODO: switch to "destroy" on next major
  var unsetDestroy = opts.unset === 'destroy';

  if (Array.isArray(secret) && secret.length === 0) {
    throw new TypeError('secret option array must contain one or more strings');
  }

  if (secret && !Array.isArray(secret)) {
    secret = [secret];
  }

  if (!secret) {
    deprecate('req.secret; provide secret option');
  }

  // notify user that this store is not
  // meant for a production environment
  // 通知这个用户 不能
  if ('production' == env && store instanceof MemoryStore) {
    /* istanbul ignore next: not tested */
    console.warn(warning);
  }

  ///**************  以上都是对各种参数的校验   **************////

  // generates the new session （生成新的session）
  store.generate = function (req) {
    req.sessionID = generateId(req);
    req.session = new Session(req);
    req.session.cookie = new Cookie(cookieOptions);

    if (cookieOptions.secure === 'auto') {
      req.session.cookie.secure = issecure(req, trustProxy);
    }
  };

  var storeImplementsTouch = typeof store.touch === 'function';

  // register event listeners for the store to track readiness
  // 注册时间监听器 用于 追踪store 是否就绪
  var storeReady = true;
  store.on('disconnect', function ondisconnect() {
    storeReady = false
  });
  store.on('connect', function onconnect() {
    storeReady = true
  });

  return function session(req, res, next) {
    //如果session存在，则跳过
    if (req.session) {
      next();
      return;
    }

    // Handle connection as if there is no session if （连接handle）
    // the store has temporarily disconnected etc
    if (!storeReady) {
      debug('store is disconnected');
      next();
      return
    }

    // pathname mismatch （路径不匹配）
    var originalPath = parseUrl.original(req).pathname;
    if (originalPath.indexOf(cookieOptions.path || '/') !== 0) return next();

    // ensure a secret is available or bail （确保一个secret 是可用的 xxx？？？）
    if (!secret && !req.secret) {
      next(new Error('secret option required for sessions'));
      return;
    }

    // backwards compatibility for signed cookies  （向后兼容的 签名cookie）
    // req.secret is passed from the cookie parser middleware （req.secret 是通过cookie 中间解析器）
    var secrets = secret || [req.secret];

    var originalHash;
    var originalId;
    var savedHash;
    var touched = false;

    // expose store
    req.sessionStore = store;

    // get the session ID from the cookie
    var cookieId = req.sessionID = getcookie(req, name, secrets);

    // set-cookie
    onHeaders(res, function () {
      if (!req.session) {
        debug('no session');
        return;
      }

      if (!shouldSetCookie(req)) {
        return;
      }

      // only send secure cookies via https
      if (req.session.cookie.secure && !issecure(req, trustProxy)) {
        debug('not secured');
        return;
      }

      if (!touched) {
        // touch session
        req.session.touch();
        touched = true
      }

      // set cookie
      setcookie(res, name, req.sessionID, secrets[0], req.session.cookie.data);
    });

    // proxy end() to commit the session
    var _end = res.end;
    var _write = res.write;
    var ended = false;
    res.end = function end(chunk, encoding) {
      if (ended) {  //结束标志
        return false;
      }

      ended = true;//转换结束状态

      var ret;
      var sync = true;

      function writeend() {
        if (sync) {
          ret = _end.call(res, chunk, encoding);
          sync = false;
          return;
        }

        _end.call(res);
      }

      function writetop() {
        if (!sync) {
          return ret;
        }

        if (chunk == null) {
          ret = true;
          return ret;
        }

        var contentLength = Number(res.getHeader('Content-Length'));

        if (!isNaN(contentLength) && contentLength > 0) {
          // measure chunk
          chunk = !Buffer.isBuffer(chunk)
              ? new Buffer(chunk, encoding)
              : chunk;
          encoding = undefined;

          if (chunk.length !== 0) {
            debug('split response');
            ret = _write.call(res, chunk.slice(0, chunk.length - 1));
            chunk = chunk.slice(chunk.length - 1, chunk.length);
            return ret;
          }
        }

        ret = _write.call(res, chunk, encoding);
        sync = false;

        return ret;
      }

      if (shouldDestroy(req)) {
        // destroy session
        debug('destroying');
        store.destroy(req.sessionID, function ondestroy(err) {
          if (err) {
            defer(next, err);
          }

          debug('destroyed');
          writeend();
        });

        return writetop();
      }

      // no session to save
      if (!req.session) {
        debug('no session');
        return _end.call(res, chunk, encoding);
      }

      if (!touched) {
        // touch session
        req.session.touch();
        touched = true
      }

      if (shouldSave(req)) {
        req.session.save(function onsave(err) {
          if (err) {
            defer(next, err);
          }

          writeend();
        });

        return writetop();
      } else if (storeImplementsTouch && shouldTouch(req)) {
        // store implements touch method
        debug('touching');
        store.touch(req.sessionID, req.session, function ontouch(err) {
          if (err) {
            defer(next, err);
          }

          debug('touched');
          writeend();
        });

        return writetop();
      }

      return _end.call(res, chunk, encoding);
    };

    // generate the session
    function generate() {
      store.generate(req);
      originalId = req.sessionID;
      originalHash = hash(req.session);
      wrapmethods(req.session);
    }

    // wrap session methods
    function wrapmethods(sess) {
      var _save = sess.save;

      function save() {
        debug('saving %s', this.id);
        savedHash = hash(this);
        _save.apply(this, arguments);
      }

      Object.defineProperty(sess, 'save', {
        configurable: true,
        enumerable: false,
        value: save,
        writable: true
      });
    }

    // check if session has been modified （检查 session是否被修改）
    function isModified(sess) {
      return originalId !== sess.id || originalHash !== hash(sess);
    }

    // check if session has been saved
    function isSaved(sess) {
      return originalId === sess.id && savedHash === hash(sess);
    }

    // determine if session should be destroyed
    function shouldDestroy(req) {
      return req.sessionID && unsetDestroy && req.session == null;
    }

    // determine if session should be saved to store
    function shouldSave(req) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        debug('session ignored because of bogus req.sessionID %o', req.sessionID);
        return false;
      }

      return !saveUninitializedSession && cookieId !== req.sessionID
          ? isModified(req.session)
          : !isSaved(req.session)
    }

    // determine if session should be touched
    function shouldTouch(req) {
      // cannot set cookie without a session ID
      if (typeof req.sessionID !== 'string') {
        debug('session ignored because of bogus req.sessionID %o', req.sessionID);
        return false;
      }

      return cookieId === req.sessionID && !shouldSave(req);
    }

    // determine if cookie should be set on response （确定这个cookie是否应该设置在响应上）
    function shouldSetCookie(req) {
      // cannot set cookie without a session ID （不能设置一个cookie，因为没有一个sessionId）
      if (typeof req.sessionID !== 'string') {
        return false;
      }

      return cookieId != req.sessionID
          ? saveUninitializedSession || isModified(req.session)
          : rollingSessions || req.session.cookie.expires != null && isModified(req.session);
    }


    // generate a session if the browser doesn't send a sessionID
    if (!req.sessionID) {
      debug('no SID sent, generating session');
      generate();
      next();
      return;
    }

    // generate the session object
    debug('fetching %s', req.sessionID);
    store.get(req.sessionID, function(err, sess){
      // error handling
      if (err) {
        debug('error %j', err);

        if (err.code !== 'ENOENT') {
          next(err);
          return;
        }

        generate();
        // no session
      } else if (!sess) {
        debug('no session found');
        generate();
        // populate req.session
      } else {
        debug('session found');
        store.createSession(req, sess);
        originalId = req.sessionID;
        originalHash = hash(sess);

        if (!resaveSession) {
          savedHash = originalHash
        }

        wrapmethods(req.session);
      }

      next();
    });
  }
}


/**
 * Generate a session ID for a new session.
 * 生成新的session 为 新的session
 * @return {String}
 * @private
 */
function generateSessionId(sess) {
  return uid(24);
}

/**
 * Get the session ID cookie from request.
 *
 * @return {string}
 * @private
 */
function getcookie(req, name, secrets) {
  var header = req.headers.cookie;
  var raw;
  var val;

  // read from cookie header
  if (header) {
    var cookies = cookie.parse(header);

    raw = cookies[name];

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), secrets);

        if (val === false) {
          debug('cookie signature invalid');
          val = undefined;
        }
      } else {
        debug('cookie unsigned')
      }
    }
  }

  // back-compat read from cookieParser() signedCookies data
  if (!val && req.signedCookies) {
    val = req.signedCookies[name];

    if (val) {
      deprecate('cookie should be available in req.headers.cookie');
    }
  }

  // back-compat read from cookieParser() cookies data
  if (!val && req.cookies) {
    raw = req.cookies[name];

    if (raw) {
      if (raw.substr(0, 2) === 's:') {
        val = unsigncookie(raw.slice(2), secrets);

        if (val) {
          deprecate('cookie should be available in req.headers.cookie');
        }

        if (val === false) {
          debug('cookie signature invalid');
          val = undefined;
        }
      } else {
        debug('cookie unsigned')
      }
    }
  }

  return val;
}

/**
 * Hash the given `sess` object omitting changes to `.cookie`.
 *
 * @param {Object} sess
 * @return {String}
 * @private
 */
function hash(sess) {
  return crc(JSON.stringify(sess, function (key, val) {
    if (key !== 'cookie') {
      return val;
    }
  }));
}

/**
 * Determine if request is secure.
 *
 * @param {Object} req
 * @param {Boolean} [trustProxy]
 * @return {Boolean}
 * @private
 */
function issecure(req, trustProxy) {
  // socket is https server
  if (req.connection && req.connection.encrypted) {
    return true;
  }

  // do not trust proxy
  if (trustProxy === false) {
    return false;
  }

  // no explicit trust; try req.secure from express
  if (trustProxy !== true) {
    var secure = req.secure;
    return typeof secure === 'boolean'
        ? secure
        : false;
  }

  // read the proto from x-forwarded-proto header
  var header = req.headers['x-forwarded-proto'] || '';
  var index = header.indexOf(',');
  var proto = index !== -1
      ? header.substr(0, index).toLowerCase().trim()
      : header.toLowerCase().trim()

  return proto === 'https';
}

/**
 * Set cookie on response.
 * 设置 response上的 cookie
 * @private
 */
function setcookie(res, name, val, secret, options) { //val 为sessionId
  var signed = 's:' + signature.sign(val, secret);//根据val和secret制作无符号签名
  var data = cookie.serialize(name, signed, options);//根据name ,sign ,options 制作cookie

  debug('set-cookie %s', data);

  var prev = res.getHeader('set-cookie') || [];      //获得以前已经存在的
  var header = Array.isArray(prev) ? prev.concat(data)
      : Array.isArray(data) ? [prev].concat(data)
      : [prev, data];

  res.setHeader('set-cookie', header)
}


/**
 * Verify and decode the given `val` with `secrets`.
 *
 * @param {String} val
 * @param {Array} secrets
 * @returns {String|Boolean}
 * @private
 */
function unsigncookie(val, secrets) {
  for (var i = 0; i < secrets.length; i++) {
    var result = signature.unsign(val, secrets[i]);

    if (result !== false) {
      return result;
    }
  }

  return false;
}
