# Simple-session

## 就是复写express-session

## 安装
````bash
npm install express-session
````

## API
```js
var session=require('express-session');
```

### session(options)

用指定的options创建一个session中间件

**注意：** cookie 中不会保存session中的所有数据，仅仅保存sessionID。session数据会被存储在服务器端。

**注意：** 自从version 1.5.0,不再需要[`cookie-parser` 中间件](https://www.npmjs.com/package/cookie-parser)就能运行。这个模块现在能在req/res上直接读取和写入cookies。
Using `cookie-parser` may result in issuesif the `secret` is not the same between this module and `cookie-parser`.

**警告：** 默认的服务器端的存储，`MemoryStore`,不是专门为生产环境设计的。
在绝大多数情况下它会泄漏内存，适用于过去的单一程序，仅仅用于调试和开发。

stores（存储插件）列表, see [compatible session stores](#compatible-session-stores).

#### Options

`express-session` accepts these properties in the options object.

##### cookie

Settings object for the session ID cookie.这个默认值是`{ path: '/', httpOnly: true, secure: false, maxAge: null }`.

##### cookie.domain
Specifies the value for the Domain Set-Cookie attribute.在默认情况下，no domain is set, and most clients will consider the cookie to apply to only the current domain.

##### cookie.expires
指定Date对象的值作为 Expires（过期时间）`Set-Cookie`属性。
在默认情况下，没有设置过期时间，并且大多数的用户将会考虑设置一个“非持久性cookie (non-persistent cookie)”
或者在某些条件才删除cookie，例如在浏览器退出的时候删除cookie。

**注意：** 如果在options中同时设置了`expires` 和 `maxage`，但是只有定义在后面的才会生效(????这个代码实际还待考察)

**注意：** `expires` 参数应该不直接设置；相反仅仅使用 `maxage`参数

##### cookie.httpOnly
指定一个`boolean`值用作`Set-Cookie`中HttpOnly的属性。当为true时，`HttpOnly`属性会设置，否则不会设置。默认情况下，`HttpOnly`属性是会设置的。

**注意：** 小心当设置为`true`的时候，在遵从这个规则的浏览器中，将不会允许客户端js查看中document.cookie中的cookie。

##### cookie.maxAge
指定一个`number`（以毫秒为单位）值用作`Set-Cookie` 中的`Expires`属性。
This is done by taking the current server time and adding maxAge milliseconds to the value to calculate an Expires datetime
在默认情况下，no maximum age is set.

**注意：** 如果在options中同时设置了`expires` 和 `maxage`，但是只有定义在后面的才会生效(????这个代码实际还待考察)

##### cookie.path
指定一个值用作`Set-cookie`的`Path`属性。在默认情况，设置为`'/'` ，which is the root path of the domain.




。。。。。
 （还有一些cookie的设置）
。。。。。
 （还有一些cookie的设置）
。。。。。

##### genid
调用此函数生成一个新的session ID。
提供一个能生成字符串作为sessionID的函数。
这个函数的第一个参数是`req`，如果你想在生成的时候附加一些`req`上的某些值。

默认值是用`uid-safe`这个函数随机生成的IDs

**注意：** 一定要生成唯一的ids，否则session会有冲突。
```js
app.use(session({
  genid: function(req) {
    return genuuid() // use UUIDs for session IDs
  },
  secret: 'keyboard cat'
}))
```
##### name
sessionID 在cookie中的name，设置在response中（和从request中读）。

默认值是'connect.sid'。

**注意：** 如果我们有多个apps运行在同一个hostname下 (这个仅仅是一个name， 即 localhost or 127.0.0.1; different schemes and ports do not name a different hostname), 
当你需要区分session 从每一个cookie中。最简单的方法就是在每一个不同的设置不同`name`。

##### proxy
当设置安全cookies，信任反响代理（通过 "X-Forwarded-Proto" header）.

这个默认值是 `undefined`.
  - `true` The "X-Forwarded-Proto" 头被使用。
  - `flase` 所有headers被忽略，并且认为连接是安全的，如果有一个直接 TLS/SSL 连接
  - `undefined` 使用来自express的"trust proxy"设置

##### resave
强制将session保存到session store 中。即使session在请求过程中从未被修改过。根据你的store这可能是需要的，
但是它也可能会造成竞争条件（create race conditions）当其中一个客户端发送两个平行的请求到你的服务器时，
and changes made to the session in one request may get overwritten when the other request ends, even if it made no changes (this behavior also depends on what store you're using).

这个默认值是`true`，但是使用默认值已经过时，所以未来可能会改变。请仔细研究这个设置和选项，在什么使用情况下适合你，通常情况下，你会想要`false`。

How do I know if this is necessary for my store? The best way to know is to check with your store if it implements the touch method. If it does, then you can safely set resave: false. If it does not implement the touch method and your store sets an expiration date on stored sessions, then you likely need resave: true.






