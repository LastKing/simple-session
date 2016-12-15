#Simple-session

##就是复写express-session

##安装
````bash
npm install express-session
````

##API
```js
var session=require('express-session');
```

###session(options)

用指定的options创建一个session中间件

**注意：** cookie 中不会保存session中的所有数据，仅仅保存sessionID。session数据会被存储在服务器端。

**注意：** 自从version 1.5.0,不再需要[`cookie-parser` 中间件](https://www.npmjs.com/package/cookie-parser)就能运行。这个模块现在能在req/res上直接读取和写入cookies。
Using `cookie-parser` may result in issuesif the `secret` is not the same between this module and `cookie-parser`.

**警告：**默认的服务器端的存储，`MemoryStore`,不是专门为生产环境设计的。
在绝大多数情况下它会泄漏内存，适用于过去的单一程序，仅仅用于调试和开发。

stores（存储插件）列表, see [compatible session stores](#compatible-session-stores).

####Options

`express-session` accepts these properties in the options object.











