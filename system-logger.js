import { initializeApp as _i } from "firebase/app";
import {
    getFirestore as _g,
    collection as _c,
    addDoc as _a,
    serverTimestamp as _t,
    doc as _d,
    getDoc as _gd
} from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDw2W7XlQVr1AamOSAKasodFz7VdN5Pf-0",
    authDomain: "alqurmani--vault-01.firebaseapp.com",
    projectId: "alqurmani--vault-01",
    storageBucket: "alqurmani--vault-01.firebasestorage.app",
    messagingSenderId: "49696238141",
    appId: "1:49696238141:web:3395e3c712ecdd1f485854",
    measurementId: "G-YHYP4D8SCY"
};

const app = _i(firebaseConfig);
const db = _g(app);

const SystemLogger = (() => {

    // منع التكرار
    const cache = new Map();

    // =========================
    // UTIL: IDs
    // =========================

    const genId = (prefix = "") =>
        `${prefix}${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

    const getSessionId = async (userId) => {
        // احصل على session من Firestore أو أنشئ واحدة جديدة
        const sessionRef = _d(db, "Sessions", userId);
        const sessionSnap = await _gd(sessionRef);

        let session;
        if (!sessionSnap.exists()) {
            // إنشاء جلسة جديدة إذا لم توجد
            session = {
                sessionId: genId("sess_"),
                createdAt: _t(),
                lastSeen: Date.now()
            };
            await addDoc(_c(db, "Sessions"), {
                userId,
                ...session
            });
        } else {
            // تحديث الجلسة الحالية
            session = sessionSnap.data();
            if (Date.now() - session.lastSeen > 30 * 60 * 1000) {
                session.sessionId = genId("sess_");
            }
            session.lastSeen = Date.now();
            await addDoc(_c(db, "Sessions"), {
                userId,
                ...session,
                updated: _t()
            });
        }
        return session.sessionId;
    };

    const getCorrelationId = (sessionId) => {
        // correlation ثابت لكل سلسلة أحداث داخل نفس session
        // استخدم sessionId لتتبع السلسلة
        return sessionId; // إعادة استخدام sessionId كـ correlation
    };

    const isDuplicate = (key, limitMs = 2500) => {
        const now = Date.now();
        if (cache.has(key)) {
            const last = cache.get(key);
            if (now - last < limitMs) return true;
        }
        cache.set(key, now);
        return false;
    };

    // =========================
    // CLASSIFICATION
    // =========================

    const getLevel = (risk) => {
        if (risk >= 80) return "CRITICAL";
        if (risk >= 40) return "WARNING";
        return "INFO";
    };

    const getTags = (action = "") => {
        const a = action.toLowerCase();
        const tags = [];

        if (a.includes("login")) tags.push("auth");
        if (a.includes("logout")) tags.push("auth");
        if (a.includes("access")) tags.push("access");
        if (a.includes("payment")) tags.push("finance");
        if (a.includes("error")) tags.push("error");
        if (a.includes("hack") || a.includes("attack")) tags.push("security");

        return tags.length ? tags : ["general"];
    };

    // =========================
    // LOG CORE
    // =========================

    const log = async (action, risk, userId, meta = {}) => {

        if (!action || !userId) return;
        if (typeof risk !== "number") return;

        const sessionId = await getSessionId(userId); // session من Firestore
        const correlationId = getCorrelationId(sessionId); // correlation ثابت

        const key = `${action}_${userId}_${risk}`;

        if (isDuplicate(key)) return;

        const level = getLevel(risk);
        const tags = getTags(action);

        try {
            const logsRef = _c(db, "Logs");

            // 📊 Dashboard-ready schema
            await _a(logsRef, {
                action,
                risk,
                level,
                tags,

                userId,

                sessionId,
                correlationId,

                meta: {
                    ...meta
                },

                timestamp: _t()
            });

            console.log(`Log stored [${level}]`);
            return true;

        } catch (e) {
            console.error("Log error:", e);
            return false;
        }
    };

    return {
        send: log
    };

})();

export default SystemLogger;
