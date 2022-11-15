## setTimeout vs setImmediate
   ┌───────────────────────────┐
┌─>│           timers          │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │
│  └─────────────┬─────────────┘      ┌───────────────┐
│  ┌─────────────┴─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │
│  └─────────────┬─────────────┘      │   data, etc.  │
│  ┌─────────────┴─────────────┐      └───────────────┘
│  │           check           │
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │
   └───────────────────────────┘

定时器：本阶段执行已经被 setTimeout() 和 setInterval() 的调度回调函数。
待定回调：执行延迟到下一个循环迭代的 I/O 回调。
idle, prepare：仅系统内部使用。
轮询：检索新的 I/O 事件;执行与 I/O 相关的回调（几乎所有情况下，除了关闭的回调函数，那些由计时器和 setImmediate() 调度的之外），其余情况 node 将在适当的时候在此阻塞。
检测：setImmediate() 回调函数在这里执行。
关闭的回调函数：一些关闭的回调函数，如：socket.on('close', ...)。

```javascript
setTimeout(function() {
    console.log('setTimeout')
}, 0);
setImmediate(function() {
    console.log('setImmediate')
});

```

解析： 上面的执行效果是不确定的。 
1. setTimeout 的延迟即便是0，但是实际执行时候，nodejs会强制最小值为 1ms。
2. 每次进入时间循环，nodejs 会请求系统时钟，获取当前时间，如果CPU忙，这个耗时超过 1ms，那么 setTimeout 可以得到优先执行；如果返回很快，则 setImmediate 先执行；

```javascript
const fs = require('fs');

fs.readFile(__filename, () => {
    setTimeout(() => {
        console.log('timeout')
    }, 0);
    setImmediate(() => {
        console.log('immediate')
    })
});
```
解析： setImmediate 优先 setTimeout执行。因为在读取文件的回调执行完成以后（I/O在poll阶段），接下来就轮到 check阶段的 setImmediate 了。

https://nodejs.org/zh-cn/docs/guides/event-loop-timers-and-nexttick/
https://blog.insiderattack.net/timers-immediates-and-process-nexttick-nodejs-event-loop-part-2-2c53fd511bb3
https://blog.insiderattack.net/javascript-event-loop-vs-node-js-event-loop-aea2b1b85f5c


### process.nextTick
nextTick 的回调函数，会在event loop 的开始以及各个阶段（如 定时器到期、IO回调、Immediate回调以及close事件），在对应回调全部执行后，得到检测执行。

nextTick 本身不是event loop 的内容，而是nodejs的实现；它允许我们把一些代码放在下一次event-loop之前得到及时执行。
这种回调设计在一些场景是需要的：
1. 不打断当前event-loop的继续执行，又能够确保下一次循环前得到执行，比如 异常的处理；
2. 允许我们把事件注册函数，写在事件触发之后，比如构造函数里面执行事件；

```javascript
const fs = require('fs');

let bar;
function getFileSize(fileName, cb) {
	if (typeof fileName !== 'string') {
		return cb(new TypeError('argument fileName should be string'))
	}
	fs.stat(fileName, (err, stats) => {
		if (err) {
			return cb(err);
		}
		cb(null, stats.size);
	})
}

// error
getFileSize(1, (err, size) => {
	if (err) {
		throw err;
	}
	console.log('File size: ', size);
});

// 后面的代码都执行不到了。
console.log('Hello')

// 其他的初始化代码
bar = 1;
// ...

```
getFileSize 因为参数错误，后面的代码—— console.log('hello') 都没有能够得到执行。如果 我们用nextTick，则可以解决该问题：
```javascript
function getFileSize(fileName, cb) {
	if (typeof fileName !== 'string') {
		// 在 nextTick 的时候得到执行
		return process.nextTick(
				cb ,
				new TypeError('argument fileName should be string')
			);
	}
	fs.stat(fileName, (err, stats) => {
		if (err) {
			return cb(err);
		}
		cb(null, stats.size);
	})
}
```
服务器实例化的例子：
```javascript
const server = net.createServer(() => {}).listen(8080);

server.on('listening', () => {});
```
服务器在执行绑定端口 8080 的时候，系统可能已经触发了 listening 事件。

构造函数执行的例子: 
```javascript
const EventEmitter = require('events');
const util = require('util');

function MyEmitter() {
  EventEmitter.call(this);
  // this.emit('event'); 直接触发的时候，事件监听函数还没有
  // 
  process.nextTick(() => {
    this.emit('event');
  });
}
util.inherits(MyEmitter, EventEmitter);

const myEmitter = new MyEmitter();

myEmitter.on('event', () => {
  console.log('an event occurred!');
});
```