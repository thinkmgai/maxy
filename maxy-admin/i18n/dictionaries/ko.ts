const ko = {
  common: {
    languageToggle: "언어",
    languageName: {
      ko: "한국어",
      en: "English",
    },
  },
  menu: {
    totalAnalysis: "종합 분석",
    logAnalysis: "로그 분석",
    performanceAnalysis: "성능 분석",
    funnelAnalysis: "퍼널 분석",
    userAnalysis: "사용자 분석",
    report: "보고서",
    management: "관리",
    systemManagement: "시스템 관리",
  },
  login: {
    hero: {
      title: "데이터로 완성하는 모바일 사용자 경험",
      description: [
        "실시간 크래시 모니터링부터 사용자 여정 분석까지",
        "MAXY가 제공하는 인사이트로 안정적인 서비스를 운영해 보세요.",
      ],
      imageAlt: "모바일 분석을 위한 MAXY 대시보드",
    },
    welcome: "MAXY를 통한 모바일 모니터링을 시작합니다.",
    findPassword: "비밀번호 찾기",
    placeholders: {
      userId: "ID",
      password: "Password",
      email: "Email",
    },
    buttons: {
      login: "LOGIN",
      language: "언어 전환",
    },
    messages: {
      otpRequired: "추가 보안을 위해 OTP 등록이 필요합니다.",
      otpPrompt: "앱에서 발급된 6자리 OTP 코드를 입력해 주세요.",
      otpExpired: "OTP 인증 시간이 만료되었습니다. 다시 시도해 주세요.",
      otpSuccess: "OTP 인증이 완료되었습니다. 이제 MAXY 관리 콘솔을 사용할 수 있습니다.",
      otpReset: "OTP를 다시 등록해 주세요.",
      otpIncomplete: "OTP 코드 6자리를 모두 입력해 주세요.",
      mailSent: "입력하신 이메일로 임시 비밀번호를 전송했습니다.",
    },
    errors: {
      userIdRequired: "아이디를 입력해 주세요.",
      passwordRequired: "비밀번호를 입력해 주세요.",
      emailInvalid: "올바른 이메일 주소를 입력해 주세요.",
      submit: "로그인에 실패했습니다.",
    },
    otp: {
      register: {
        title: "OTP를 등록하세요",
        highlight: "Google Authenticator",
        description: "앱에서 OTP를 등록하고 보안을 강화하세요.",
        steps: [
          "Google Authenticator 앱을 설치합니다.",
          "MAXY 계정을 등록하고 QR 코드를 스캔합니다.",
          "인증번호를 입력하면 로그인 준비가 완료됩니다.",
        ],
        buttons: {
          back: "이전",
          complete: "완료",
        },
      },
      store: {
        title: "Google Authenticator",
        description: [
          "앱을 다운로드하고 설치한 후",
          "OTP를 등록해 보안을 강화하세요.",
        ],
        items: {
          app: {
            title: "Apple 사용자",
            button: "App Store QR 보기",
          },
          play: {
            title: "Android 사용자",
            button: "Play Store QR 보기",
          },
        },
        buttons: {
          back: "이전",
          close: "이전",
        },
      },
      input: {
        title: "OTP를 입력하세요",
        description: "6자리의 OTP 번호를 입력하세요",
        retry: "OTP 재등록",
        failLabel: "OTP 코드 입력 상태",
        failCount: "({current}/{total})",
        buttons: {
          back: "이전",
          confirm: "완료",
        },
        ariaDigitLabel: "{index}번째 OTP 숫자",
      },
    },
    findPw: {
      title: "비밀번호 찾기",
      instructions: "입력하신 이메일로 임시 비밀번호가 발송됩니다.",
      buttons: {
        back: "취소",
        send: "전송",
      },
    },
    language: {
      prefix: "Language",
    },
    copyright: "Copyright 2025 THINKM Inc. All rights reserved.",
  },
  analytics: {
    heading: "분석",
  },
};

type DeepStringRecord<T> =
  T extends string
    ? string
    : T extends readonly (infer U)[]
      ? DeepStringRecord<U>[]
      : T extends Record<string, unknown>
        ? { [K in keyof T]: DeepStringRecord<T[K]> }
        : T;

export type Dictionary = DeepStringRecord<typeof ko>;

const koDictionary: Dictionary = ko;

export default koDictionary;
