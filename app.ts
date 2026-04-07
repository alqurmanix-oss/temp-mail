// app.ts
// ==========================================
// 🔐 Al-Qarmani X - Core Security & Logic
// ==========================================

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

// 1. إعدادات Firebase الخاصة بك
const firebaseConfig = {
    apiKey: "AIzaSyCoM-Aqq7VwTDx5ZeHmIpHM4sm2XM0WdKw",
    authDomain: "alqurmanix-15b92.firebaseapp.com",
    projectId: "alqurmanix-15b92",
    storageBucket: "alqurmanix-15b92.firebasestorage.app",
    messagingSenderId: "477352026568",
    appId: "1:477352026568:web:49f90cd3fc74b6948ba0fd",
    measurementId: "G-VJF36N1MCD"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 2. الحماية الحديدية: التحقق الفوري من شرعية الدخول
const verifyAccess = async (user: any) => {
    if (!user) {
        // إذا لم يكن مسجلاً للدخول يتم طرده فوراً لصفحة index
        window.location.replace("index.html");
        return;
    }

    if (!user.emailVerified) {
        // طرد إذا لم يقم بتفعيل الإيميل (حسب الـ Rules)
        await signOut(auth);
        window.location.replace("index.html");
        return;
    }

    // جلب بيانات المستخدم من Firestore للتحقق من الحالة
    const userRef = doc(db, "users", user.uid);
    try {
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // مطابقة القواعد: هل الحساب نشط؟
            if (data.status !== "active" || data.inactivityStatus !== "active") {
                await signOut(auth);
                window.location.replace("index.html");
                return;
            }

            // سحب بيانات الجلسة وتحديثها (IP / مدة / آخر نشاط)
            updateSessionData(user.uid);
        } else {
            // ليس له ملف في القاعدة
            await signOut(auth);
            window.location.replace("index.html");
        }
    } catch (error) {
        console.error("Access Denied by Firestore Rules:", error);
        window.location.replace("index.html");
    }
};

// 3. مستمع حالة المصادقة (يعمل تلقائياً عند تحميل الصفحة)
onAuthStateChanged(auth, (user) => {
    // كإجراء حماية إضافي للمتطفلين، التحقق من Referrer
    const referrer = document.referrer;
    // يمكنك تفعيل السطر القادم لو أردت إجبار الدخول المباشر فقط من خلال index
    // if (!referrer.includes("index.html") && !sessionStorage.getItem("legit_login")) { window.location.replace("index.html"); }

    verifyAccess(user);
});

// 4. دالة سحب بيانات الجلسة (IP افتراضي أو عبر API، ومدة الجلسة)
const updateSessionData = async (uid: string) => {
    const userRef = doc(db, "users", uid);
    
    // تسجيل وقت بداية الجلسة محلياً
    sessionStorage.setItem("session_start", Date.now().toString());

    try {
        // تحديث آخر نشاط لتجنب "التجميد التلقائي" المذكور في القواعد
        await updateDoc(userRef, {
            lastActivity: Date.now()
        });
    } catch (error) {
        console.error("فشل تحديث النشاط:", error);
    }
};

// ==========================================
// 🎨 UI Logic - التفاعلات والواجهة
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. تحديث الوقت والتاريخ الفعلي
    const liveDateTimeElement = document.getElementById("liveDateTime");
    const updateTime = () => {
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = { 
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit' 
        };
        if(liveDateTimeElement) {
            liveDateTimeElement.innerText = now.toLocaleDateString('ar-EG', options);
        }
    };
    setInterval(updateTime, 1000);
    updateTime();

    // 2. تفعيل قائمة اللغات عند الضغط على الكرة الأرضية
    const globeBtn = document.getElementById("globeBtn");
    const langDropdown = document.getElementById("langDropdown");
    
    if (globeBtn && langDropdown) {
        globeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle("active");
        });

        // إغلاق القائمة عند الضغط خارجها
        document.addEventListener("click", () => {
            if (langDropdown.classList.contains("active")) {
                langDropdown.classList.remove("active");
            }
        });
    }

    // 3. تحكم النافذة المنبثقة (الدعاء)
    const modal = document.getElementById("duaaModal");
    const openModalBtn = document.getElementById("openModalBtn");
    const closeModalBtn = document.getElementById("closeModalBtn");

    if (modal && openModalBtn && closeModalBtn) {
        openModalBtn.addEventListener("click", () => {
            modal.classList.add("active");
        });

        closeModalBtn.addEventListener("click", () => {
            modal.classList.remove("active");
        });

        // إغلاق عند الضغط في الخلفية
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.remove("active");
            }
        });
    }
});
