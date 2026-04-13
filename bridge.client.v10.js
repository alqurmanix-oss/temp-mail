import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const app = initializeApp({
  apiKey: "AIzaSyBICr62Oa_-69hATpfFrdTDf0O9WV4bVVvU",
  authDomain: "alqurmanix-d49f7.firebaseapp.com",
  projectId: "alqurmanix-d49f7"
});

const auth = getAuth(app);

/* =========================
   🌐 GLOBAL NODE ROUTER
========================= */
const GLOBAL_NODES = [
  "https://edge-a.security.net",
  "https://edge-b.security.net",
  "https://edge-c.security.net"
];

/* =========================
   🔐 HASH CORE
========================= */
const sha256 = async (data) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
};

/* =========================
   🌍 GLOBAL DEVICE FINGERPRINT
========================= */
const getDeviceFP = async () =>
  sha256([
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || 0,
    navigator.deviceMemory || 0
  ].join("|"));

/* =========================
   🚀 SEND TO SECURITY INTERNET
========================= */
export const sendToSecurityInternet = async (action, payload = {}) => {
  const user = auth.currentUser;

  if (!user && action !== "register") {
    return { status: "DENIED" };
  }

  const token = user ? await user.getIdToken(true) : null;

  const packet = {
    action,
    token,
    payload,
    meta: {
      ts: Date.now(),
      nonce: crypto.randomUUID(),
      device: await getDeviceFP()
    }
  };

  const signature = await sha256(JSON.stringify(packet));

  const node = GLOBAL_NODES[Math.floor(Math.random() * GLOBAL_NODES.length)];

  return fetch(node, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ packet, signature })
  }).then(r => r.json());
};
