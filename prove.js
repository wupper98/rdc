let ts = Date.now();

let date_ob = new Date(ts);
let date = date_ob.getDate();
let month = date_ob.getMonth() + 1;
let year = date_ob.getFullYear();
let hour = date_ob.getHours();
let minute = date_ob.getMinutes();
let seconds = date_ob.getSeconds();

var timestamp = year + "-" + month + "-" + date + "-" + hour + ":" + minute + ":" + seconds
console.log(timestamp);

var t = new Date(timestamp);
console.log(t);

var tt = new Date(2020, 0);
console.log(tt);

console.log(Date.now());