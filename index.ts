// ============================================================
// AlqurmanixX - Main Index (TypeScript)
// ============================================================

import { initializeApp, FirebaseApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  Auth,
  UserCredential,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Firestore,
} from "firebase/firestore";

// ─── Firebase Config ─────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCoM-Aqq7VwTDx5ZeHmIpHM4sm2XM0WdKw",
  authDomain: "alqurmanix-15b92.firebaseapp.com",
  projectId: "alqurmanix-15b92",
  storageBucket: "alqurmanix-15b92.firebasestorage.app",
  messagingSenderId: "477352026568",
  appId: "1:477352026568:web:49f90cd3fc74b6948ba0fd",
  measurementId: "G-VJF36N1MCD",
};

const app: FirebaseApp = initializeApp(firebaseConfig);
getAnalytics(app);
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);

// ─── Device Fingerprint ──────────────────────────────────────
function generateDeviceFingerprint(): string {
  const nav = window.navigator;
  const screen = window.screen;
  const raw = [
    nav.userAgent,
    nav.language,
    screen.colorDepth,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    nav.hardwareConcurrency || 0,
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  const fp = Math.abs(hash).toString(16).padStart(16, "0");
  return fp;
}

// ─── Rate Limit Guard ─────────────────────────────────────────
const rateLimitMap: Map<string, number> = new Map();
function checkRateLimit(key: string, limitMs: number = 5000): boolean {
  const last = rateLimitMap.get(key) || 0;
  const now = Date.now();
  if (now - last < limitMs) return false;
  rateLimitMap.set(key, now);
  return true;
}

// ─── Input Sanitizer ─────────────────────────────────────────
function sanitizeInput(input: string): string {
  return input
    .replace(/[<>'"]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}

// ─── Password Validator ───────────────────────────────────────
interface PasswordStrength {
  score: number;
  hasLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}
function checkPasswordStrength(password: string): PasswordStrength {
  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  const score = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(
    Boolean
  ).length;
  return { score, hasLength, hasUpper, hasLower, hasNumber, hasSpecial };
}

// ─── Registration ─────────────────────────────────────────────
async function registerUser(email: string, password: string): Promise<void> {
  const cleanEmail = sanitizeInput(email);
  const deviceFp = generateDeviceFingerprint();

  if (!checkRateLimit("register_" + cleanEmail, 10000)) {
    showModal("error", "⏳ يرجى الانتظار قليلاً قبل المحاولة مرة أخرى.");
    return;
  }

  try {
    const cred: UserCredential = await createUserWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );
    const user = cred.user;

    await setDoc(doc(db, "users", user.uid), {
      email: cleanEmail,
      createdAt: serverTimestamp(),
      status: "pending",
      inactivityStatus: "active",
      deviceFingerprint: deviceFp,
      lastKnownDevice: navigator.userAgent,
      loggedDevicesCount: 1,
      lastActivity: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });

    await sendEmailVerification(user);

    showModal(
      "success-register",
      "🎉 تم إنشاء حسابك بنجاح! تم إرسال رابط التفعيل إلى بريدك الإلكتروني. يرجى تفعيل حسابك قبل تسجيل الدخول."
    );
  } catch (err: any) {
    const msg = translateFirebaseError(err.code);
    showModal("error", msg);
  }
}

// ─── Login ────────────────────────────────────────────────────
async function loginUser(email: string, password: string): Promise<void> {
  const cleanEmail = sanitizeInput(email);
  const deviceFp = generateDeviceFingerprint();

  if (!checkRateLimit("login_" + cleanEmail, 5000)) {
    showModal("error", "⏳ محاولات كثيرة. يرجى الانتظار 5 ثوانٍ.");
    return;
  }

  try {
    const cred: UserCredential = await signInWithEmailAndPassword(
      auth,
      cleanEmail,
      password
    );
    const user = cred.user;

    if (!user.emailVerified) {
      showModal("not-verified", user.uid);
      return;
    }

    await updateDoc(doc(db, "users", user.uid), {
      lastActivity: serverTimestamp(),
      lastLogin: serverTimestamp(),
      deviceFingerprint: deviceFp,
      lastKnownDevice: navigator.userAgent,
    });

    showModal("success-login", user.email || "");
  } catch (err: any) {
    const msg = translateFirebaseError(err.code);
    showModal("error", msg);
  }
}

// ─── Resend Verification ──────────────────────────────────────
async function resendVerification(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  if (!checkRateLimit("resend_" + user.uid, 60000)) {
    showModal("error", "⏳ يرجى الانتظار دقيقة قبل إعادة الإرسال.");
    return;
  }
  try {
    await sendEmailVerification(user);
    showModal(
      "info",
      "✅ تم إرسال رابط التفعيل مجدداً. تحقق من بريدك الإلكتروني."
    );
  } catch {
    showModal("error", "حدث خطأ أثناء إرسال رابط التفعيل.");
  }
}

// ─── Forgot Password ──────────────────────────────────────────
async function forgotPassword(email: string): Promise<void> {
  const cleanEmail = sanitizeInput(email);
  if (!checkRateLimit("reset_" + cleanEmail, 30000)) {
    showModal("error", "⏳ يرجى الانتظار 30 ثانية قبل المحاولة مجدداً.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    showModal(
      "info",
      "📧 تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني."
    );
  } catch (err: any) {
    showModal("error", translateFirebaseError(err.code));
  }
}

// ─── Firebase Error Translator ────────────────────────────────
function translateFirebaseError(code: string): string {
  const map: Record<string, string> = {
    "auth/email-already-in-use": "⚠️ هذا البريد الإلكتروني مسجل مسبقاً.",
    "auth/invalid-email": "⚠️ البريد الإلكتروني غير صالح.",
    "auth/weak-password": "⚠️ كلمة السر ضعيفة جداً.",
    "auth/user-not-found": "⚠️ لا يوجد حساب بهذا البريد الإلكتروني.",
    "auth/wrong-password": "⚠️ كلمة السر غير صحيحة.",
    "auth/too-many-requests": "⚠️ محاولات كثيرة. يرجى المحاولة لاحقاً.",
    "auth/network-request-failed": "⚠️ خطأ في الشبكة. تحقق من اتصالك.",
    "auth/user-disabled": "⚠️ هذا الحساب معطل. تواصل مع الدعم الفني.",
  };
  return map[code] || "⚠️ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.";
}

// ─── Modal System ─────────────────────────────────────────────
function showModal(type: string, data: string): void {
  const overlay = document.getElementById("modal-overlay")!;
  const box = document.getElementById("modal-box")!;
  const title = document.getElementById("modal-title")!;
  const body = document.getElementById("modal-body")!;
  const actions = document.getElementById("modal-actions")!;

  actions.innerHTML = "";

  if (type === "success-login") {
    title.textContent = "🌟 مرحباً بعودتك";
    body.textContent = `أهلاً وسهلاً بك في AlqurmanixX يا ${data} — نحن سعداء برؤيتك مجدداً!`;
    box.className = "modal-box modal-gold";
  } else if (type === "success-register") {
    title.textContent = "🎊 تم التسجيل بنجاح!";
    body.textContent = data;
    box.className = "modal-box modal-gold";
  } else if (type === "not-verified") {
    title.textContent = "📧 الحساب غير مفعّل";
    body.textContent =
      "حسابك لم يتم تفعيله بعد. يرجى الضغط على رابط التفعيل المرسل إلى بريدك الإلكتروني.";
    box.className = "modal-box modal-warn";
    const btn = document.createElement("button");
    btn.className = "modal-btn";
    btn.textContent = "إعادة إرسال رابط التفعيل";
    btn.onclick = () => {
      closeModal();
      resendVerification();
    };
    actions.appendChild(btn);
  } else if (type === "info") {
    title.textContent = "ℹ️ تنبيه";
    body.textContent = data;
    box.className = "modal-box modal-info";
  } else {
    title.textContent = "❌ خطأ";
    body.textContent = data;
    box.className = "modal-box modal-error";
  }

  const closeBtn = document.createElement("button");
  closeBtn.className = "modal-btn modal-close-btn";
  closeBtn.textContent = "إغلاق";
  closeBtn.onclick = closeModal;
  actions.appendChild(closeBtn);

  overlay.classList.add("active");
}

function closeModal(): void {
  document.getElementById("modal-overlay")!.classList.remove("active");
}

// ─── Language Config ──────────────────────────────────────────
interface Language {
  code: string;
  label: string;
  flag: string;
  file: string;
}

const languages: Language[] = [
  { code: "ar", label: "AR", flag: "🇸🇦", file: "lang/ar.json" },
  { code: "en", label: "EN", flag: "🇬🇧", file: "lang/en.json" },
  { code: "es", label: "ES", flag: "🇪🇸", file: "lang/es.json" },
  { code: "de", label: "DE", flag: "🇩🇪", file: "lang/de.json" },
  { code: "it", label: "IT", flag: "🇮🇹", file: "lang/it.json" },
  { code: "fr", label: "FR", flag: "🇫🇷", file: "lang/fr.json" },
  { code: "tr", label: "TR", flag: "🇹🇷", file: "lang/tr.json" },
  { code: "ko", label: "KO", flag: "🇰🇷", file: "lang/ko.json" },
  { code: "ja", label: "JA", flag: "🇯🇵", file: "lang/ja.json" },
  { code: "zh", label: "ZH", flag: "🇨🇳", file: "lang/zh.json" },
  { code: "hi", label: "HI", flag: "🇮🇳", file: "lang/hi.json" },
];

// ─── DOM Ready ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Password strength live check
  const pwInput = document.getElementById("reg-password") as HTMLInputElement;
  if (pwInput) {
    pwInput.addEventListener("input", () => {
      const s = checkPasswordStrength(pwInput.value);
      updatePasswordUI(s);
    });
  }

  // Confirm password check
  const confirmInput = document.getElementById(
    "reg-confirm"
  ) as HTMLInputElement;
  if (confirmInput) {
    confirmInput.addEventListener("input", () => {
      const match = confirmInput.value === pwInput?.value;
      const indicator = document.getElementById("confirm-match");
      if (indicator) {
        indicator.textContent = match ? "✅ تطابق" : "❌ لا تطابق";
        indicator.style.color = match ? "#00ff88" : "#ff4444";
      }
    });
  }

  // Register form
  const regForm = document.getElementById("register-form");
  if (regForm) {
    regForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (
        document.getElementById("reg-email") as HTMLInputElement
      ).value;
      const password = (
        document.getElementById("reg-password") as HTMLInputElement
      ).value;
      const confirm = (
        document.getElementById("reg-confirm") as HTMLInputElement
      ).value;

      if (password !== confirm) {
        showModal("error", "⚠️ كلمتا السر غير متطابقتين.");
        return;
      }
      const strength = checkPasswordStrength(password);
      if (strength.score < 4) {
        showModal("error", "⚠️ كلمة السر لا تستوفي الشروط المطلوبة.");
        return;
      }
      await registerUser(email, password);
    });
  }

  // Login form
  const loginForm = document.getElementById("login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = (
        document.getElementById("login-email") as HTMLInputElement
      ).value;
      const password = (
        document.getElementById("login-password") as HTMLInputElement
      ).value;
      await loginUser(email, password);
    });
  }

  // Forgot password
  const forgotBtn = document.getElementById("forgot-btn");
  if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
      const email = (
        document.getElementById("login-email") as HTMLInputElement
      ).value;
      if (!email) {
        showModal("error", "⚠️ أدخل البريد الإلكتروني أولاً.");
        return;
      }
      await forgotPassword(email);
    });
  }

  // Modal close on overlay click
  document.getElementById("modal-overlay")?.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).id === "modal-overlay") closeModal();
  });

  // Tab switching
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = (btn as HTMLElement).dataset.tab;
      document.querySelectorAll(".tab-btn").forEach((b) =>
        b.classList.remove("active")
      );
      document.querySelectorAll(".tab-panel").forEach((p) =>
        p.classList.remove("active")
      );
      btn.classList.add("active");
      document.getElementById(target + "-panel")?.classList.add("active");
    });
  });

  // Language globe dropdown
  const globeBtn = document.getElementById("globe-btn");
  const langDropdown = document.getElementById("lang-dropdown");
  if (globeBtn && langDropdown) {
    globeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      langDropdown.classList.toggle("open");
    });
    document.addEventListener("click", () =>
      langDropdown.classList.remove("open")
    );
  }

  buildLangDropdown();
  spawnGoldParticles();
});

// ─── Password UI Update ───────────────────────────────────────
function updatePasswordUI(s: PasswordStrength): void {
  const bar = document.getElementById("strength-bar") as HTMLElement;
  const rules = {
    rule1: s.hasLength,
    rule2: s.hasUpper,
    rule3: s.hasLower,
    rule4: s.hasNumber,
    rule5: s.hasSpecial,
  };

  Object.entries(rules).forEach(([id, passed]) => {
    const el = document.getElementById(id);
    if (el) {
      el.querySelector(".rule-icon")!.textContent = passed ? "✅" : "⭕";
      el.style.color = passed ? "#00ff88" : "#888";
    }
  });

  if (bar) {
    const pct = (s.score / 5) * 100;
    bar.style.width = pct + "%";
    if (s.score <= 2) bar.style.background = "#ff4444";
    else if (s.score === 3) bar.style.background = "#ffaa00";
    else if (s.score === 4) bar.style.background = "#88ff00";
    else bar.style.background = "#00ff88";
  }
}

// ─── Language Dropdown Builder ────────────────────────────────
function buildLangDropdown(): void {
  const dropdown = document.getElementById("lang-dropdown");
  if (!dropdown) return;
  dropdown.innerHTML = "";
  languages.forEach((lang) => {
    const item = document.createElement("a");
    item.href = lang.file;
    item.className = "lang-item";
    item.innerHTML = `<span class="lang-flag">${lang.flag}</span><span class="lang-code">${lang.code.toUpperCase()}</span>`;
    item.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("lang-dropdown")?.classList.remove("open");
    });
    dropdown.appendChild(item);
  });
}

// ─── Gold Particles ───────────────────────────────────────────
function spawnGoldParticles(): void {
  const container = document.getElementById("particles-container");
  if (!container) return;

  const goldColors = [
    "#FFD700",
    "#FFC200",
    "#FFAA00",
    "#FFE066",
    "#FFF0A0",
    "#F5A623",
    "#E8940A",
  ];

  for (let i = 0; i < 55; i++) {
    const p = document.createElement("div");
    p.className = "gold-particle";
    const size = Math.random() * 8 + 3;
    const color = goldColors[Math.floor(Math.random() * goldColors.length)];
    p.style.cssText = `
      width:${size}px;
      height:${size}px;
      background:${color};
      left:${Math.random() * 100}%;
      top:${Math.random() * 100}%;
      animation-duration:${3 + Math.random() * 6}s;
      animation-delay:${Math.random() * 5}s;
      opacity:${0.4 + Math.random() * 0.6};
      border-radius:50%;
      box-shadow:0 0 ${size * 2}px ${color};
    `;
    container.appendChild(p);
  }
}

// Export for module bundlers
export { registerUser, loginUser, forgotPassword, resendVerification };
