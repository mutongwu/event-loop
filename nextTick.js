console.log('start');
process.nextTick(() => console.log('nextTick 1'));
Promise.resolve().then(() => {
    console.log('promise');
});
setTimeout(function(){
    console.log('setTimeout 0'); 

    setTimeout(function(){
        console.log('setTimeout 1'); 
    },0);

    process.nextTick(() => console.log('nextTick in timeout 0'));
},0)  
process.nextTick(() => console.log('nextTick 2'));
console.log('end');

/* output:

    start
    end
    nextTick 1
    nextTick 2 // nextTick 先于 promise
    promise
    setTimeout 0
    nextTick in timeout 0
    setTimeout 1
*/
// https://blog.insiderattack.net/javascript-event-loop-vs-node-js-event-loop-aea2b1b85f5c
// https://blog.insiderattack.net/timers-immediates-and-process-nexttick-nodejs-event-loop-part-2-2c53fd511bb3