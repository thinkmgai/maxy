import type { Dictionary } from "./ko";

const en: Dictionary = {
  common: {
    languageToggle: "Language",
    languageName: {
      ko: "한국어",
      en: "English",
    },
  },
  menu: {
    totalAnalysis: "Overview",
    logAnalysis: "Log Analysis",
    performanceAnalysis: "Performance",
    funnelAnalysis: "Funnel Analysis",
    userAnalysis: "User Analysis",
    report: "Reports",
    management: "Management",
    systemManagement: "System",
  },
  login: {
    hero: {
      title: "Craft mobile experiences with data",
      description: [
        "From real-time crash monitoring to journey analytics,",
        "use MAXY insights to deliver a reliable service.",
      ],
      imageAlt: "MAXY dashboard for mobile analytics",
    },
    welcome: "Start mobile monitoring with MAXY.",
    findPassword: "Forgot password",
    placeholders: {
      userId: "ID",
      password: "Password",
      email: "Email",
    },
    buttons: {
      login: "LOGIN",
      language: "Switch language",
    },
    messages: {
      otpRequired: "Two-factor verification is required. Register your OTP.",
      otpPrompt: "Enter the six-digit OTP code from the app.",
      otpExpired: "Your OTP session has expired. Please try again.",
      otpSuccess: "OTP verification complete. Welcome to the MAXY admin console.",
      otpReset: "Please register your OTP again.",
      otpIncomplete: "Enter all six digits of the OTP code.",
      mailSent: "We sent a temporary password to the email address you entered.",
    },
    errors: {
      userIdRequired: "Please enter your ID.",
      passwordRequired: "Please enter your password.",
      emailInvalid: "Enter a valid email address.",
      submit: "로그인에 실패했습니다.",
    },
    otp: {
      register: {
        title: "Register your OTP",
        highlight: "Google Authenticator",
        description: "Set up OTP to keep your account secure.",
        steps: [
          "Install the Google Authenticator app.",
          "Add your MAXY account and scan the QR code.",
          "Enter the verification code to finish.",
        ],
        buttons: {
          back: "Back",
          complete: "Continue",
        },
      },
      store: {
        title: "Google Authenticator",
        description: [
          "Install the app from your preferred store,",
          "then register your OTP to strengthen security.",
        ],
        items: {
          app: {
            title: "Apple users",
            button: "Show App Store QR",
          },
          play: {
            title: "Android users",
            button: "Show Play Store QR",
          },
        },
        buttons: {
          back: "Back",
          close: "Back",
        },
      },
      input: {
        title: "Enter your OTP",
        description: "Type the six-digit OTP code.",
        retry: "Register again",
        failLabel: "OTP input progress",
        failCount: "({current}/{total})",
        buttons: {
          back: "Back",
          confirm: "Verify",
        },
        ariaDigitLabel: "OTP digit {index}",
      },
    },
    findPw: {
      title: "Reset password",
      instructions: "We will send a temporary password to the email you provide.",
      buttons: {
        back: "Cancel",
        send: "Send",
      },
    },
    language: {
      prefix: "Language",
    },
    copyright: "Copyright 2025 THINKM Inc. All rights reserved.",
  },
  analytics: {
    heading: "Analytics",
  },
};

export default en;
