"use client";
// Next.js 및 React 관련 라이브러리 import
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import type { ClipboardEvent, FormEvent, KeyboardEvent } from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
// 다국어 지원을 위한 번역 훅
import { useI18n } from "../../components/i18n/TranslationProvider";
// 로그인 페이지 스타일
import "../../public/css/login.css";
import { Login, OTPLogin } from "../api/Login";
import { useUserSettings } from "@/components/usersettings/UserSettingsProvider";
import { getLocalTimezoneInfo } from "@/components/usersettings/timezoneTable";

// OTP 관련 상수 및 타입 정의
const OTP_LENGTH = 6; // OTP 코드 길이
const STORE_KEYS = ["app", "play"] as const; // 앱 스토어 종류 (iOS 앱스토어, 안드로이드 플레이스토어)

// OTP 단계를 나타내는 타입
type OtpStage = "hidden" | "register" | "store" | "input";
// 앱 스토어 키 타입
type StoreKey = (typeof STORE_KEYS)[number];

// 초기 OTP 자릿수 배열을 생성하는 함수
const getInitialOtpDigits = () => Array.from({ length: OTP_LENGTH }, () => "");

/**
 * 로그인 페이지 컴포넌트
 * - 사용자 인증 및 OTP 인증을 처리하는 폼을 제공
 * - 다국어 지원
 * - 비밀번호 찾기 기능 포함
 */
export default function LoginClientPage() {
  // 다국어 지원을 위한 훅
  const { dictionary, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const userSettings = useUserSettings();
  const otherLocale = locale === "ko" ? "en" : "ko";

  // 로그인 폼 상태
  const [userId, setUserId] = useState("admin");
  const [password, setPassword] = useState("Tldzmdpa!23");
  const [errors, setErrors] = useState<{ userId?: string; password?: string; submit?: string }>({});
  const [loginMessage, setLoginMessage] = useState<string | null>(null);
  
  // OTP 관련 상태
  const [otpStage, setOtpStage] = useState<OtpStage>("hidden");
  const [otpDigits, setOtpDigits] = useState<string[]>(getInitialOtpDigits);
  const otpRefs = useRef<Array<HTMLInputElement | null>>(Array.from({ length: OTP_LENGTH }, () => null));
  const [otpCountdown, setOtpCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 비밀번호 찾기 관련 상태
  const [findPwOpen, setFindPwOpen] = useState(false);
  const [findPwForm, setFindPwForm] = useState({ userId: "", email: "" });
  const [findPwStatus, setFindPwStatus] = useState<string | null>(null);
  
  // QR 코드 다운로드 스토어 선택 상태
  const [qrStore, setQrStore] = useState<StoreKey | null>(null);

  // 앱 스토어 옵션 설정 (iOS/Android)
  const storeOptions = useMemo(
    () =>
      STORE_KEYS.map((key) => ({
        key,
        // iOS와 안드로이드에 따라 다른 아이콘 사용
        icon: key === "app" ? "/images/maxy/detail-ios.svg" : "/images/maxy/detail-android.svg",
      })),
    []
  );

  // 컴포넌트 마운트 시 body에 login-view 클래스 추가
  useEffect(() => {
    document.body.classList.add("login-view");
    // 컴포넌트 언마운트 시 클래스 제거 및 인터벀 클리어
    return () => {
      document.body.classList.remove("login-view");
    };
  }, []);

  // OTP 입력 단계에서만 카운트다운 실행
  useEffect(() => {
    if (otpStage === "input") {
      // 기존 인터벀 정리
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      // 1초마다 카운트다운 감소
      countdownRef.current = setInterval(() => {
        setOtpCountdown((prev) => {
          // 카운트다운이 1 이하가 되면 정지
          if (prev <= 1) {
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
            // OTP 만료 메시지 표시
            setLoginMessage(dictionary.login.messages.otpExpired);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (countdownRef.current) {
      // OTP 단계가 아닐 때 인터벀 정리
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }

    // 컴포넌트 언마운트 시 인터벀 정리
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [otpStage, dictionary.login.messages.otpExpired]);

  // OTP 입력 단계로 전환되면 첫 번째 입력 필드에 포커스
  useEffect(() => {
    if (otpStage === "input") {
      setOtpDigits(["1", "1", "1", "1", "1", "1"]);
      otpRefs.current[0]?.focus();
    }
  }, [otpStage]);

  // 언어 전환 함수 (한국어/영어)
  const switchLocale = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      router.push(`/${otherLocale}`);
      return;
    }
    // 현재 경로에서 언어 코드만 변경
    segments[0] = otherLocale;
    router.push(`/${segments.join("/")}`);
  };

  // 로그인 폼 유효성 검사
  const validateLogin = () => {
    const nextErrors: { userId?: string; password?: string } = {};
    // 사용자 ID 검증
    if (!userId.trim()) {
      nextErrors.userId = dictionary.login.errors.userIdRequired;
    }
    // 비밀번호 검증
    if (!password.trim()) {
      nextErrors.password = dictionary.login.errors.passwordRequired;
    }
    setErrors(nextErrors);
    // 에러가 없으면 true 반환
    return Object.keys(nextErrors).length === 0;
  };

  // OTP 관련 상태를 초기화하는 함수
  const resetOtp = () => {
    setOtpDigits(getInitialOtpDigits()); // OTP 자릿수 초기화
    setQrStore(null); // QR 코드 스토어 초기화
    if (countdownRef.current) {
      clearInterval(countdownRef.current); // 카운트다운 인터벀 정리
      countdownRef.current = null;
    }
    setOtpCountdown(0); // 카운트다운 초기화
  };

  // OTP 흐름을 닫고 초기화하는 함수
  const closeOtpFlow = () => {
    setOtpStage("hidden"); // OTP 단계를 숨김으로 변경
    resetOtp(); // OTP 상태 초기화
  };

  // 로그인 폼 제출 핸들러
  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 기본 폼 제출 방지
    setLoginMessage(null); // 이전 로그인 메시지 초기화

    //$$ 임시: 로그인 버튼 클릭 시 의도적으로 오류를 발생시킵니다.
    // throw new Error("Intentional login click error");

    // 유효성 검사 실패 시 중단
    if (!validateLogin()) {
      return;
    }
    const timezoneInfo = getLocalTimezoneInfo();
    const loginData = await Login(userId, password, {
      timezone: timezoneInfo.timeZone,
    });
    console.log(loginData);

    if (loginData.code === 200) {
      // 유효성 검사 통과 시
      setErrors({}); // 에러 상태 초기화
      setOtpStage("register"); // OTP 등록 단계로 전환
      setLoginMessage(dictionary.login.messages.otpRequired); // OTP 필요 메시지 표시
    }
    else {
      console.error(loginData.Message);
      setErrors({ submit: dictionary.login.errors.submit });
    }
    
  };

  // OTP 입력 필드 변경 핸들러
  const handleOtpChange = (index: number, value: string) => {
    // 숫자만 허용하고 마지막 한 글자만 추출
    const sanitized = value.replace(/\D/g, "").slice(-1);
    
    // OTP 자릿수 상태 업데이트
    setOtpDigits((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });

    // 다음 입력 필드로 자동 포커스 이동
    if (sanitized && index < OTP_LENGTH - 1) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  // OTP 입력 필드 키보드 이벤트 핸들러
  const handleOtpKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    // 백스페이스 키 처리: 현재 필드가 비어있으면 이전 필드로 이동
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      event.preventDefault();
      otpRefs.current[index - 1]?.focus();
      return;
    }

    // 왼쪽 화살표 키: 이전 필드로 이동
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      otpRefs.current[index - 1]?.focus();
    }

    // 오른쪽 화살표 키: 다음 필드로 이동
    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      otpRefs.current[index + 1]?.focus();
    }
  };

  // OTP 필드에 붙여넣기 처리 함수
  const handleOtpPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    
    // 클립보드에서 텍스트를 가져와 숫자만 추출하고 최대 길이 제한
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) {
      return;
    }

    // 붙여넣은 숫자로 OTP 자릿수 업데이트
    setOtpDigits(() => {
      const next = getInitialOtpDigits();
      pasted.split("").forEach((digit, idx) => {
        next[idx] = digit;
      });
      return next;
    });

    // 붙여넣은 후 적절한 위치에 포커스 이동
    setTimeout(() => {
      const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      otpRefs.current[focusIndex]?.focus();
    }, 0);
  };

  // OTP 값 문자열로 조합
  const otpValue = otpDigits.join("");

  // OTP 확인 버튼 클릭 핸들러
  const handleOtpConfirm = async () => {
    // OTP 길이 검증
    if (otpValue.length !== OTP_LENGTH) {
      setLoginMessage(dictionary.login.messages.otpIncomplete);
      return;
    }

    const timezoneInfo = getLocalTimezoneInfo();
    const otpData = await OTPLogin(otpValue, {
      timezone: timezoneInfo.timeZone,
    });
    // console.log(otpData);
    if (otpData.code !== 200) {
      setLoginMessage(otpData.Message);
      return;
    }

    const { userId, language, level, applicationId, widgetIds, userNo } = otpData;
    userSettings.setUserNo(typeof userNo === "number" ? userNo : null);
    userSettings.setUserId(userId);
    userSettings.setLanguage(language);
    userSettings.setLevel(level);
    userSettings.setApplicationId(applicationId);
    userSettings.setWidgetIds(widgetIds);
    userSettings.setTmzutc(timezoneInfo.offsetMinutes);

    //maxy login 연동 
    if (typeof window !== "undefined") {
      const maxy = (window as typeof window & { maxy?: { login?: (uid: string) => void } }).maxy;
      if (maxy && typeof maxy.login === "function") {
        try {
          maxy.login(userId);
        } catch (error) {
          console.error("Failed to call maxy.login", error);
        }
      }
    }
    //--

    // OTP 검증 성공 처리
    setLoginMessage(dictionary.login.messages.otpSuccess);
    closeOtpFlow();
    router.push(`/${locale}/PTotalAnalysis`);
  };

  // OTP 재설정 핸들러
  const handleOtpReset = () => {
    resetOtp(); // OTP 상태 초기화
    setOtpStage("register"); // OTP 등록 단계로 복귀
    setLoginMessage(dictionary.login.messages.otpReset); // 재설정 메시지 표시
  };

  // OTP 등록 완료 후 입력 단계로 전환하는 핸들러
  const handleOtpCompleteRegistration = () => {
    setOtpStage("input"); // OTP 입력 단계로 전환
    setOtpCountdown(180); // 3분(180초) 카운트다운 설정
    setLoginMessage(dictionary.login.messages.otpPrompt); // OTP 입력 안내 메시지 표시
  };

  // 앱 스토어 선택 화면으로 전환하는 핸들러
  const handleOtpStoreOpen = () => {
    setOtpStage("store"); // 앱 스토어 선택 단계로 전환
    setLoginMessage(dictionary.login.messages.otpRequired); // OTP 필요 메시지 표시
  };

  // 앱 스토어 선택에서 뒤로 가기 핸들러
  const handleStoreBack = () => {
    setOtpStage("register"); // OTP 등록 단계로 복귀
    setQrStore(null); // 선택된 스토어 초기화
  };

  // 비밀번호 찾기 폼 제출 핸들러
  const handleFindPwSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); // 기본 폼 제출 방지
    setFindPwStatus(null); // 기존 상태 메시지 초기화

    // 입력값 정제
    const trimmedId = findPwForm.userId.trim();
    const trimmedEmail = findPwForm.email.trim();

    // 사용자 ID 유효성 검사
    if (!trimmedId) {
      setFindPwStatus(dictionary.login.errors.userIdRequired);
      return;
    }

    // 이메일 형식 검증
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFindPwStatus(dictionary.login.errors.emailInvalid);
      return;
    }

    // 비밀번호 재설정 메일 전송 성공 처리
    setFindPwStatus(dictionary.login.messages.mailSent);
    setFindPwForm({ userId: "", email: "" }); // 폼 초기화
  };

  const closeFindPw = () => {
    setFindPwOpen(false);
    setFindPwStatus(null);
    setFindPwForm({ userId: "", email: "" });
  };

  const formattedCountdown =
    otpCountdown > 0 ? `${String(Math.floor(otpCountdown / 60)).padStart(1, "0")}:${String(otpCountdown % 60).padStart(2, "0")}` : null;

  return (
    <main className="login_page">
      <section className="login_showcase">
        <div className="login_showcase_image">
          <Image
            src="/images/maxy/img-login-bg.png"
            alt={dictionary.login.hero.imageAlt}
            width={560}
            height={560}
            priority
          />
        </div>
        <div className="login_showcase_copy">
          <h1>{dictionary.login.hero.title}</h1>
          <p>
            {dictionary.login.hero.description.map((line, index) => (
              <Fragment key={`${line}-${index}`}>
                {line}
                {index < dictionary.login.hero.description.length - 1 ? <br /> : null}
              </Fragment>
            ))}
          </p>
        </div>
      </section>

      <section className="login_wrap">
        <form className="login_box" onSubmit={handleLogin}>
          <div className="login_meta">
            <button type="button" className="lang_switch" onClick={switchLocale}>
              {dictionary.login.language.prefix}: {dictionary.common.languageName[otherLocale]}
            </button>
          </div>
          <div className="login_title">
            <Image src="/images/maxy/maxy_BI_WH.svg" alt="MAXY" width={140} height={40} priority />
          </div>
          <p className="welcome_txt">{dictionary.login.welcome}</p>
          <button type="button" className="find_pw" onClick={() => setFindPwOpen(true)}>
            {dictionary.login.findPassword}
          </button>
          <label className="sr_only" htmlFor="userId">
            {dictionary.login.placeholders.userId}
          </label>
          <input
            id="userId"
            type="text"
            placeholder={dictionary.login.placeholders.userId}
            tabIndex={1}
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            autoComplete="username"
          />
          {errors.userId ? <span className="err_txt">{errors.userId}</span> : <span className="err_txt" aria-hidden />}
          <label className="sr_only" htmlFor="userPw">
            {dictionary.login.placeholders.password}
          </label>
          <input
            id="userPw"
            type="password"
            placeholder={dictionary.login.placeholders.password}
            tabIndex={2}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
          {errors.password ? <span className="err_txt">{errors.password}</span> : <span className="err_txt" aria-hidden />}
          {errors.submit ? <span className="err_txt">{errors.submit}</span> : null}
          <button id="btnLogin" type="submit" className="login_btn">
            {dictionary.login.buttons.login}
          </button>
          {loginMessage ? <p className="login_hint">{loginMessage}</p> : null}
        </form>
        <p className="copyright">{dictionary.login.copyright}</p>
      </section>

      {otpStage !== "hidden" ? (
        <div className="modal_portal">
          <div className="dimmed" aria-hidden onClick={closeOtpFlow} />
          {otpStage === "register" ? (
            <div className="login_box otp_reg">
              <div className="otp_reg_title">{dictionary.login.otp.register.title}</div>
              <div className="otp_reg_txt">
                <span
                  className="point"
                  role="button"
                  tabIndex={0}
                  onClick={handleOtpStoreOpen}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      handleOtpStoreOpen();
                    }
                  }}
                >
                  {dictionary.login.otp.register.highlight}
                </span>
                <span>{dictionary.login.otp.register.description}</span>
              </div>
              <div className="otp_reg_box">
                {dictionary.login.otp.register.steps.map((step, index) => (
                  <p key={`otp-step-${index}`}>{step}</p>
                ))}
              </div>
              <div className="button_wrap">
                <button className="btn_common opposite" type="button" onClick={closeOtpFlow}>
                  {dictionary.login.otp.register.buttons.back}
                </button>
                <button className="btn_common otp_opposite" type="button" onClick={handleOtpCompleteRegistration}>
                  {dictionary.login.otp.register.buttons.complete}
                </button>
              </div>
            </div>
          ) : null}

          {otpStage === "store" ? (
            <div className="login_box otp_qr_store">
              <div className="otp_reg_txt">
                <span className="point">{dictionary.login.otp.store.title}</span>
                <span>
                  {dictionary.login.otp.store.description.map((line, index) => (
                    <Fragment key={`store-desc-${index}`}>
                      {line}
                      {index < dictionary.login.otp.store.description.length - 1 ? <br /> : null}
                    </Fragment>
                  ))}
                </span>
              </div>

              {storeOptions.map((store) => {
                const storeDictionary = dictionary.login.otp.store.items[store.key];
                return (
                  <div className="qr_btn_wrap" key={store.key}>
                    <div className="qr_store_icon">
                      <Image src={store.icon} alt={storeDictionary.title} width={28} height={28} />
                      <span>{storeDictionary.title}</span>
                    </div>
                    <button className="btn_qr_open" type="button" onClick={() => setQrStore(store.key)}>
                      <Image src="/images/maxy/qr/icon-qr-symbol.svg" alt="QR code icon" width={24} height={24} />
                      <span>{storeDictionary.button}</span>
                    </button>
                  </div>
                );
              })}

              {qrStore ? (
                <div className="qr_code_wrap">
                  <div className="qr_store_title">{dictionary.login.otp.store.items[qrStore].button}</div>
                  <Image
                    src={
                      qrStore === "app"
                        ? "/images/maxy/qr/qrcode_apps.apple.com.svg"
                        : "/images/maxy/qr/qrcode_play.google.com.svg"
                    }
                    alt={dictionary.login.otp.store.items[qrStore].button}
                    width={180}
                    height={180}
                  />
                  <button className="btn_common opposite" type="button" onClick={() => setQrStore(null)}>
                    {dictionary.login.otp.store.buttons.close}
                  </button>
                </div>
              ) : null}

              <div className="qr_footer_wrap">
                <button className="btn_common opposite" type="button" onClick={handleStoreBack}>
                  {dictionary.login.otp.store.buttons.back}
                </button>
              </div>
            </div>
          ) : null}

          {otpStage === "input" ? (
            <div className="login_box otp_input">
              <div className="otp_reg_title">{dictionary.login.otp.input.title}</div>
              <div className="otp_reg_txt">{dictionary.login.otp.input.description}</div>
              <div className="otp_space_between">
                <button className="blue" type="button" onClick={handleOtpReset}>
                  {dictionary.login.otp.input.retry}
                </button>
                <span className="otp_countdown">{formattedCountdown ?? "03:00"}</span>
              </div>
              <div className="otp_box">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    onPaste={handleOtpPaste}
                    aria-label={dictionary.login.otp.input.ariaDigitLabel.replace("{index}", String(index + 1))}
                  />
                ))}
              </div>
              <div
                className="otp_fail_box"
                style={{ visibility: otpValue.length === OTP_LENGTH ? "hidden" : "visible" }}
              >
                <span>{dictionary.login.otp.input.failLabel}</span>
                <span>
                  {dictionary.login.otp.input.failCount
                    .replace("{current}", String(otpValue.length))
                    .replace("{total}", String(OTP_LENGTH))}
                </span>
              </div>
              <div className="button_wrap">
                <button className="btn_common opposite" type="button" onClick={closeOtpFlow}>
                  {dictionary.login.otp.input.buttons.back}
                </button>
                <button className="btn_common otp_opposite" type="button" onClick={handleOtpConfirm}>
                  {dictionary.login.otp.input.buttons.confirm}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {findPwOpen ? (
        <div className="modal_portal">
          <div className="dimmed" aria-hidden onClick={closeFindPw} />
          <form className="popup_common" onSubmit={handleFindPwSubmit}>
            <h4>{dictionary.login.findPw.title}</h4>
            <label className="sr_only" htmlFor="userIdFind">
              {dictionary.login.placeholders.userId}
            </label>
            <input
              id="userIdFind"
              type="text"
              placeholder={dictionary.login.placeholders.userId}
              value={findPwForm.userId}
              onChange={(event) => setFindPwForm((prev) => ({ ...prev, userId: event.target.value }))}
            />
            <label className="sr_only" htmlFor="userEmailFind">
              {dictionary.login.placeholders.email}
            </label>
            <input
              id="userEmailFind"
              type="email"
              placeholder={dictionary.login.placeholders.email}
              value={findPwForm.email}
              onChange={(event) => setFindPwForm((prev) => ({ ...prev, email: event.target.value }))}
            />
            <div className="popup_msg">{dictionary.login.findPw.instructions}</div>
            {findPwStatus ? <div className="popup_status">{findPwStatus}</div> : null}
            <div className="popup_footer login_footer">
              <button className="btn_common popup_cls" type="button" onClick={closeFindPw}>
                {dictionary.login.findPw.buttons.back}
              </button>
              <button className="btn_common opposite" type="submit">
                {dictionary.login.findPw.buttons.send}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </main>
  );
}
