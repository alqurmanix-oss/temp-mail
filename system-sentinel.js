import { initializeApp as _i } from "firebase/app";
import {
getFirestore as _g,
doc as _d,
setDoc as _s,
serverTimestamp as _t,
arrayUnion as _u
} from "firebase/firestore";

const _0x = (() => {

const _db = _g(_i({
apiKey: "AIzaSy...",
authDomain: "alqurmani--vault-01.firebaseapp.com",
projectId: "alqurmani--vault-01"
}));

// 🧬 Canvas Fingerprint
const _cfp = () => {
try {
const c = document.createElement("canvas");
const x = c.getContext("2d");
x.textBaseline = "top";
x.font = "14px Arial";
x.fillText("secure", 2, 2);
return btoa(c.toDataURL()).slice(0, 120);
} catch { return ""; }
};

// 🧬 Extended Fingerprint
const _fp = () => {
try {
return btoa([
navigator.userAgent,
navigator.hardwareConcurrency,
navigator.deviceMemory,
screen.width + "x" + screen.height,
_cfp()
].join("|")).slice(0, 120);
} catch { return ""; }
};

// 🕵️‍♂️ DevTools Detection
const _dev = () => {
const t = performance.now();
debugger;
return performance.now() - t > 100;
};

// 🚫 Hook Detection
const _hook = () => {
try {
return Function.prototype.toString.toString().length < 50;
} catch { return true; }
};

// 🧠 Behavior + anomaly
let _b = { c:0,s:0,k:0,t:Date.now() };

const _track = () => {
["click","scroll","keydown"].forEach(e=>{
window.addEventListener(e,()=>_b[e[0]]++,{passive:true});
});
};

const _risk = () => {
let r = 0;

if (_dev()) r += 40;  
if (_hook()) r += 30;  

if (_b.c < 1) r += 15;  
if (_b.s < 1) r += 10;  

if (navigator.webdriver) r += 50;  

const idle = (Date.now()-_b.t)/1000;  
if (idle < 2) r += 25;  

return Math.min(r,100);

};

// 🌐 IP
const _ip = async () => {
try {
const r = await fetch("https://api.ipify.org?format=json");
return (await r.json()).ip;
} catch { return ""; }
};

const _enc = v => {
try { return btoa(v.split("").reverse().join("")); }
catch { return v; }
};

// 🎯 Adaptive Sync
const _run = async () => {
try {
const u = localStorage.getItem("_uid");
if (!u) return;

const d = _fp();  
  if (!d) return;  

  const risk = _risk();  

  // polymorphic decision  
  if (risk < 20 && Math.random() > 0.2) return;  
  if (risk < 5) return;  

  const ref = _d(_db, "users", u);  

  await _s(ref, {  
    allowedDevices: _u(d),  
    currentRegion: "EG",  
    failedLoginAttempts: 0,  
    freeze: false,  
    inactivityStatus: "active",  
    isAdmin: false,  
    lastActivity: _t(),  
    lastIP: _enc(await _ip()),  
    lastLogin: _t(),  
    lastRequestTime: _t(),  
    lastSafeAction: _t(),  
    primaryDevice: d,  
    riskScore: risk,  
    sessionVersion: "v1",  
    status: "active",  
    userSetInactivityLimit: 60  
  }, { merge: true });  

} catch {}

};

return { run:_run, track:_track };

})();

// 🕶️ Polymorphic Execution Engine
(() => {

_0x.track();

const _rand = () => Math.random()*5000+1000;

const _modes = [
() => setTimeout(()=>_0x.run(), _rand()),
() => requestIdleCallback(()=>_0x.run()),
() => {
const i = setInterval(()=>{
_0x.run();
clearInterval(i);
}, _rand());
}
];

const _exec = () => {
try {
if (document.hidden) return;
_modesMath.floor(Math.random()*_modes.length);
} catch {}
};

setTimeout(_exec, _rand());

document.addEventListener("visibilitychange", _exec);

})();
