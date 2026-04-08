
// security-core.js (FINAL BOSS - V2.0)
// نظام الحماية الشامل، الأمان السيبراني، وإدارة اللغات العالمية

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
    getFirestore,
    doc,
    getDoc,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ================= 1. إعدادات Firebase =================
const firebaseConfig = {
    apiKey: "AIzaSyCoM-Aqq7VwTDx5ZeHmIpHM4sm2XM0WdKw",
    authDomain: "alqurmanix-15b92.firebaseapp.com",
    projectId: "alqurmanix-15b92",
    storageBucket: "alqurmanix-15b92.firebasestorage.app",
    messagingSenderId: "477352026568",
    appId: "1:477352026568:web:49f90cd3fc74b6948ba0fd"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ================= 2. نظام اللغات والاتجاهات الـ 11 =================
const translations = {
    ar: { dir: "rtl", loading: "جاري التحقق من الصلاحيات...", portalMsg: "جاري تجهيز القسم المطلوب يا {name}" },
    en: { dir: "ltr", loading: "Verifying permissions...", portalMsg: "Preparing requested section, {name}" },
    zh: { dir: "ltr", loading: "正在验证权限...", portalMsg: "正在为您准备所需的部分, {name}" },
    fr: { dir: "ltr", loading: "Vérification des permissions...", portalMsg: "Préparation de la section, {name}" },
    es: { dir: "ltr", loading: "Verificando permisos...", portalMsg: "Preparando la sección, {name}" },
    de: { dir: "ltr", loading: "Berechtigungen prüfen...", portalMsg: "Bereich wird vorbereitet, {name}" },
    ru: { dir: "ltr", loading: "Проверка прав...", portalMsg: "Подготовка раздела, {name}" },
    it: { dir: "ltr", loading: "Verifica permessi...", portalMsg: "Preparazione sezione, {name}" },
    ja: { dir: "ltr", loading: "権限を確認中...", portalMsg: "セクションを準備中, {name}" },
    tr: { dir: "ltr", loading: "Yetكiler doğrulanıyor...", portalMsg: "Bölüm hazırlanıyor, {name}" },
    hi: { dir: "ltr", loading: "अनुमतियां जांची जा रही हैं...", portalMsg: "अनुभाग तैयार किया जा रहा है, {name}" }
};

// ================= 3. إنشاء بصمة الجهاز (مستقرة) =================
function getFingerprint() {
    // تم حذف performance.now لضمان ثبات البصمة لنفس الجهاز
    return btoa(
        navigator.userAgent +
        screen.width +
        screen.height +
        navigator.language
    );
}

// ================= 4. مكافحة التلاعب (Anti-Tamper) =================
function detectTampering() {
    const devtools = /./;
    devtools.toString = function () {
        forceLogout("DEVTOOLS_OPENED");
    };
    console.log(devtools);
}

// ================= 5. بروتوكول الطرد النهائي =================
async function forceLogout(reason = "SECURITY_VIOLATION") {
    console.warn("!! FORCED LOGOUT !! Reason:", reason);
    await signOut(auth);
    // تصفير الجلسة تماماً والعودة مع كود المنع
    window.location.replace("index.html?blocked=1&reason=" + reason);
}

// ================= 6. الوظيفة الجوهرية (Secure Page) =================
export function securePage(callback) {
    // تشغيل كاشف التلاعب فوراً
    detectTampering();

    onAuthStateChanged(auth, async (user) => {
        // أ. فحص وجود جلسة دخول
        if (!user) return forceLogout("NO_SESSION");

        try {
            const refUser = doc(db, "users", user.uid);
            const snap = await getDoc(refUser);

            // ب. فحص وجود المستخدم في الداتابيز
            if (!snap.exists()) throw "USER_NOT_FOUND_IN_DB";

            const data = snap.data();
            const currentFp = getFingerprint();

            // ج. فحص حالة الحساب (نشط/محظور)
            if (data.status !== "active") throw "ACCOUNT_SUSPENDED";

            // د. فحص الخمول (Inactivity)
            if (data.inactivityStatus !== "active") throw "INACTIVE_FOR_LONG_TIME";

            // هـ. فحص تفعيل الإيميل (إجباري للأمان)
            if (!user.emailVerified) throw "EMAIL_NOT_VERIFIED";

            // و. فحص اختطاف الجهاز (Fingerprint Match)
            if (data.deviceFingerprint !== currentFp) throw "UNAUTHORIZED_DEVICE_HIJACK";

            // ز. فحص انتهاء الجلسة (24 ساعة)
            if (Date.now() > data.lastLogin.toMillis() + 86400000)
                throw "SESSION_EXPIRED_PLEASE_RELOGIN";

            // ح. اكتشاف اللغة وتطبيق الاتجاه
            const userLang = (navigator.language || navigator.userLanguage).split('-')[0];
            const config = translations[userLang] || translations.en;
            document.documentElement.lang = userLang;
            document.documentElement.dir = config.dir;

            // ط. تحديث آخر ظهور ونشاط في الداتابيز (صامت)
            await updateDoc(refUser, {
                lastActivity: new Date(),
                lastKnownDevice: navigator.userAgent
            });

            // ي. السماح بالدخول وتمرير البيانات واللغة
            callback({
                user: user,
                userData: data,
                langConfig: config
            });

            // ك. إظهار محتوى الصفحة بعد الأمان
            document.body.style.opacity = "1";

        } catch (error) {
            console.error("Security Core Error:", error);
            forceLogout(error);
        }
    });
}
