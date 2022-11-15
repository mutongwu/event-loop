/*
	https://medium.com/softup-technologies/node-js-internals-event-loop-in-action-59cde8ff7e8d
	注意：
		1. nextTick 优先于 promise 执行；
		2. 每一次callback队列清空后，都会检测执行 nextTick 跟 promis 队列；
*/

const fs = require('fs');

console.log('Start');
process.nextTick(() => {
	console.log('First next—tick callback executed');
});
Promise.resolve('resolved').then((result) => {
	console.log(`First promise was ${result}`);
});

fs.readFile('index.html', (error) => {
	setTimeout(() => { 
		console.log('Timeout callback executed ');
	}, 0); 
	setImmediate(() => {
		console.log('Immediate callback executed');
	});

    if (!error) {
        console.log('File read');
    }
    Promise.resolve('resolved').then((result) => {
	    console.log(`Second promise was ${result}`);
	    process.nextTick(() => {
	    	console.log('Second next—tick callback executed');
	    });
    });
});
Promise.resolve('resolved').then((result) =>{
    console.log(`Third promise was ${result}`);
});
process.nextTick(() => {
    console.log('Third next—tick callback executed');
});
console.log('End');
process.on('exit', (exitCode) =>{
    console.log(`Process exited with code ${exitCode}`);
});

/*
Start
End
First next—tick callback executed
Third next—tick callback executed
First promise was resolved
Third promise was resolved
File read
Second promise was resolved
Second next—tick callback executed
Immediate callback executed
Timeout callback executed
Process exited with code 0
*/