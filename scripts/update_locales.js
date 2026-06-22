const fs = require('fs');

const en = require('../src/i18n/locales/en.json');
const de = require('../src/i18n/locales/de.json');
const tr = require('../src/i18n/locales/tr.json');

const newEn = {
  auth: {
    signUpSubtitle: "Sign up to lock in your commitments.",
    signInSubtitle: "Sign in to track your active commitments.",
    createAccount: "Create Account",
    signIn: "Sign In",
    welcomeBack: "Welcome Back",
    errorInvalidEmail: "Please enter a valid email address.",
    errorPasswordLength: "Password must be at least 6 characters.",
    errorNameRequired: "Please enter your name.",
    errorPasswordMismatch: "Passwords do not match.",
    appName: "HabitContract",
    appTagline: "Verify workouts. Protect stakes. Build discipline.",
    fullName: "Full Name",
    emailAddress: "Email Address",
    passwordMinChars: "Password (min. 6 chars)",
    password: "Password",
    confirmPassword: "Confirm Password",
    forgotPassword: "Forgot password?",
    demoHintPrefix: "Testing: Use ",
    demoHintSuffix: " / ",
    orContinueWith: "OR CONTINUE WITH",
    apple: "Apple",
    google: "Google",
    alreadyHaveAccount: "Already have an account? ",
    dontHaveAccount: "Don't have an account? ",
    signUp: "Sign Up"
  }
};

const newDe = {
  auth: {
    signUpSubtitle: "Registrieren, um Ihre Verpflichtungen festzulegen.",
    signInSubtitle: "Anmelden, um Ihre aktiven Verpflichtungen zu verfolgen.",
    createAccount: "Konto erstellen",
    signIn: "Anmelden",
    welcomeBack: "Willkommen zurück",
    errorInvalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein.",
    errorPasswordLength: "Das Passwort muss mindestens 6 Zeichen lang sein.",
    errorNameRequired: "Bitte geben Sie Ihren Namen ein.",
    errorPasswordMismatch: "Passwörter stimmen nicht überein.",
    appName: "HabitContract",
    appTagline: "Workouts verifizieren. Einsätze schützen. Disziplin aufbauen.",
    fullName: "Vollständiger Name",
    emailAddress: "E-Mail-Adresse",
    passwordMinChars: "Passwort (min. 6 Zeichen)",
    password: "Passwort",
    confirmPassword: "Passwort bestätigen",
    forgotPassword: "Passwort vergessen?",
    demoHintPrefix: "Testen: Nutzen Sie ",
    demoHintSuffix: " / ",
    orContinueWith: "ODER FORTFAHREN MIT",
    apple: "Apple",
    google: "Google",
    alreadyHaveAccount: "Sie haben bereits ein Konto? ",
    dontHaveAccount: "Sie haben noch kein Konto? ",
    signUp: "Registrieren"
  }
};

const newTr = {
  auth: {
    signUpSubtitle: "Taahhütlerinizi belirlemek için kaydolun.",
    signInSubtitle: "Aktif taahhütlerinizi takip etmek için giriş yapın.",
    createAccount: "Hesap Oluştur",
    signIn: "Giriş Yap",
    welcomeBack: "Tekrar Hoşgeldiniz",
    errorInvalidEmail: "Lütfen geçerli bir e-posta adresi girin.",
    errorPasswordLength: "Şifre en az 6 karakter olmalıdır.",
    errorNameRequired: "Lütfen adınızı girin.",
    errorPasswordMismatch: "Şifreler eşleşmiyor.",
    appName: "HabitContract",
    appTagline: "Antrenmanları doğrula. Bahisleri koru. Disiplin inşa et.",
    fullName: "Ad Soyad",
    emailAddress: "E-posta Adresi",
    passwordMinChars: "Şifre (min. 6 karakter)",
    password: "Şifre",
    confirmPassword: "Şifreyi Onayla",
    forgotPassword: "Şifremi unuttum?",
    demoHintPrefix: "Test: Şunu kullanın ",
    demoHintSuffix: " / ",
    orContinueWith: "VEYA ŞUNUNLA DEVAM ET",
    apple: "Apple",
    google: "Google",
    alreadyHaveAccount: "Zaten bir hesabınız var mı? ",
    dontHaveAccount: "Hesabınız yok mu? ",
    signUp: "Kaydol"
  }
};

fs.writeFileSync('../src/i18n/locales/en.json', JSON.stringify({ ...en, ...newEn }, null, 2));
fs.writeFileSync('../src/i18n/locales/de.json', JSON.stringify({ ...de, ...newDe }, null, 2));
fs.writeFileSync('../src/i18n/locales/tr.json', JSON.stringify({ ...tr, ...newTr }, null, 2));
