"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../components/i18n/TranslationProvider";
import { useTheme } from "../../components/theme/ThemeProvider";
import { useUserSettings } from "../../components/usersettings/UserSettingsProvider";

type MenuItem = {
  id: string;
  label: string;
  dataPage: string;
  dataNm: string;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  mozFullScreenElement?: Element | null;
  msFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type MaxyGlobal = {
  maxy?: {
    logout?: () => void;
  };
};

const FULLSCREEN_CHANGE_EVENTS = [
  "fullscreenchange",
  "webkitfullscreenchange",
  "mozfullscreenchange",
  "MSFullscreenChange",
];

function getActiveFullscreenElement(doc: FullscreenDocument): Element | null {
  return (
    doc.fullscreenElement ??
    doc.webkitFullscreenElement ??
    doc.mozFullScreenElement ??
    doc.msFullscreenElement ??
    null
  );
}

function requestFullscreen(element: FullscreenElement): Promise<void> | void {
  const request =
    element.requestFullscreen ??
    element.webkitRequestFullscreen ??
    element.mozRequestFullScreen ??
    element.msRequestFullscreen;
  if (request) {
    return request.call(element);
  }
  return undefined;
}

function exitFullscreen(doc: FullscreenDocument): Promise<void> | void {
  const exit =
    doc.exitFullscreen ??
    doc.webkitExitFullscreen ??
    doc.mozCancelFullScreen ??
    doc.msExitFullscreen;
  if (exit) {
    return exit.call(doc);
  }
  return undefined;
}

/** Navigation menu shown at the top of the MAXY admin dashboard. */
export function MaxyMenu() {
  const { dictionary, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { level } = useUserSettings();
  const [isIconFlipped, setIsIconFlipped] = useState(theme === "dark");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const normalizedLevel = typeof level === "number" ? level : null;
  const hasManagementPrivilege =
    normalizedLevel === 100 || normalizedLevel === 1;
  const levelKnown = normalizedLevel !== null;

  useEffect(() => {
    setIsIconFlipped(theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const doc = document as FullscreenDocument;
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(getActiveFullscreenElement(doc)));
    };

    handleFullscreenChange();
    FULLSCREEN_CHANGE_EVENTS.forEach((eventName) => {
      document.addEventListener(eventName, handleFullscreenChange);
    });

    return () => {
      FULLSCREEN_CHANGE_EVENTS.forEach((eventName) => {
        document.removeEventListener(eventName, handleFullscreenChange);
      });
    };
  }, []);

  const otherLocale = locale === "ko" ? "en" : "ko";

  const menuItems = useMemo<MenuItem[]>(() => {
    const baseItems: MenuItem[] = [
      { id: "DB0100", label: dictionary.menu.totalAnalysis, dataPage: "/PTotalAnalysis", dataNm: "menu.total.analysis" },
      { id: "TA0000", label: dictionary.menu.logAnalysis, dataPage: "/ta/0000/goTotalAnalysisView.maxy", dataNm: "menu.log.analysis" },
      { id: "PA0000", label: dictionary.menu.performanceAnalysis, dataPage: "/PPerformanceAnalysis", dataNm: "menu.performance.analysis" },
      { id: "FA0000", label: dictionary.menu.funnelAnalysis, dataPage: "/PFunnelAnalysis", dataNm: "menu.funnel.analysis" },
      { id: "UA0000", label: dictionary.menu.userAnalysis, dataPage: "/ua/0000/goUserAnalysisView.maxy", dataNm: "menu.user.analysis" },
      { id: "RT0000", label: dictionary.menu.report, dataPage: "/rt/0000/goReportView.maxy", dataNm: "menu.report" },
      { id: "GM0000", label: dictionary.menu.management, dataPage: "/PManagement", dataNm: "menu.group.management" },
    ];

    if (!levelKnown) {
      return baseItems;
    }

    if (!hasManagementPrivilege) {
      return baseItems.filter((item) => item.id !== "GM0000");
    }

    return baseItems;
  }, [dictionary.menu, hasManagementPrivilege, levelKnown]);

  const switchLocale = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) {
      router.push(`/${otherLocale}`);
      return;
    }
    segments[0] = otherLocale;
    router.push(`/${segments.join("/")}`);
  };

  const clientRoutes: Record<string, string> = useMemo(
    () => ({
      DB0100: "PTotalAnalysis",
      FA0000: "PFunnelAnalysis",
      PA0000: "PPerformanceAnalysis",
      GM0000: "PManagement?menuId=5",
    }),
    []
  );

  const selectedMenuId = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length >= 2) {
      const pageSegment = segments[1];
      if (pageSegment === "PPerformanceAnalysis") {
        return "PA0000";
      }
      if (pageSegment === "PFunnelAnalysis") {
        return "FA0000";
      }
      if (pageSegment === "PManagement") {
        return "GM0000";
      }
      if (pageSegment === "PTotalAnalysis") {
        return "DB0100";
      }
    }
    return "DB0100";
  }, [pathname]);

  const toggleFullscreenMode = useCallback(() => {
    if (typeof document === "undefined") {
      return;
    }

    const doc = document as FullscreenDocument;
    const target = document.documentElement as FullscreenElement;

    try {
      const activeElement = getActiveFullscreenElement(doc);
      if (activeElement) {
        const result = exitFullscreen(doc);
        if (result instanceof Promise) {
          result.catch((error) => {
            console.error("Failed to exit fullscreen", error);
          });
        }
        return;
      }

      const result = requestFullscreen(target);
      if (result instanceof Promise) {
        result.catch((error) => {
          console.error("Failed to enter fullscreen", error);
        });
      }
    } catch (error) {
      console.error("Fullscreen toggle failed", error);
    }
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }
    const className = "fullscreen-active";
    const root = document.documentElement;
    if (isFullscreen) {
      root.classList.add(className);
    } else {
      root.classList.remove(className);
    }
    return () => {
      root.classList.remove(className);
    };
  }, [isFullscreen]);

  const handleLogout = useCallback(() => {
    const goToLogin = () => {
      router.push("/ko");
    };

    if (typeof window === "undefined") {
      goToLogin();
      return;
    }

    const confirmed = window.confirm("로그아웃하시겠습니까?");
    if (!confirmed) {
      return;
    }

    try {
      window.sessionStorage.removeItem("maxy-admin:user-settings");
      for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith("mf-")) {
          window.sessionStorage.removeItem(key);
        }
      }
    } catch (error) {
      console.error("Failed to clear session storage during logout", error);
    }

    try {
      document.cookie = "userId=; Max-Age=0; path=/";
    } catch (error) {
      console.error("Failed to clear cookies during logout", error);
    }

    try {
      const maxy = (window as typeof window & MaxyGlobal).maxy;
      if (maxy && typeof maxy.logout === "function") {
        maxy.logout();
      }
    } catch (error) {
      console.error("Failed to call maxy.logout", error);
    }

    goToLogin();
  }, [router]);

  return (
    <header
      className="main_header"
      style={isFullscreen ? { display: "none" } : undefined}
      aria-hidden={isFullscreen ? "true" : undefined}
    >
      <div className="h_left">
        <span className="logo_img">
          <img className="maxy_logo_dk" alt="MAXY"/>
        </span>
      </div>
      <div className="h_center">
        <nav>
          <ul className="menu_wrap" id="maxyTopMenu">
            {menuItems.map((item) => (
              <li
                key={item.id}
                className={`menu_group menu_item${item.id === selectedMenuId ? " selected" : ""}`}
                data-page={item.dataPage}
                data-nm={item.dataNm}
                data-t={item.dataNm}
                id={item.id}
                onClick={() => {
                  const targetSegment = clientRoutes[item.id];
                  if (targetSegment) {
                    router.push(`/${locale}/${targetSegment}`);
                  }
                }}
                onKeyDown={(event) => {
                  const targetSegment = clientRoutes[item.id];
                  if (targetSegment && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    router.push(`/${locale}/${targetSegment}`);
                  }
                }}
                role={clientRoutes[item.id] ? "button" : undefined}
                tabIndex={clientRoutes[item.id] ? 0 : undefined}
              >
                {item.label}
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="h_right">
        <span id="showSearchPopupWrapper">
          <button id="btnShowSearchPopup" className="default_btn" style={{ display: "none" }}></button>
        </span>
        <button className="default_btn inte_db" id="btnGoInteDb"></button>
        <button
          type="button"
          className={`default_btn day_night_btn${isIconFlipped ? " flipped" : ""}`}
          onClick={() => {
            setIsIconFlipped((prev) => !prev);
            toggleTheme();
          }}
          aria-pressed={theme === "dark"}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="day_night_icon" aria-hidden="true">
            {theme === "dark" ? "Dark" : "Light"}
          </span>
        </button>
        <button
          id="btnShowUserInfo"
          className="default_btn user"
          type="button"
          onClick={handleLogout}
        ></button>
        <button id="btnTranslate" className="default_btn global" type="button" onClick={switchLocale} aria-label={dictionary.common.languageToggle}>
          <span>{otherLocale.toUpperCase()}</span>
        </button>
        <button
          id="btnMaximize"
          type="button"
          className={`default_btn full${isFullscreen ? " is-fullscreen" : ""}`}
          style={{ display: "inline-block" }}
          onClick={toggleFullscreenMode}
          aria-pressed={isFullscreen}
          aria-label={
            locale === "ko"
              ? isFullscreen
                ? "전체 화면 종료"
                : "전체 화면으로 보기"
              : isFullscreen
                ? "Exit fullscreen"
                : "Enter fullscreen"
          }
          title={
            locale === "ko"
              ? isFullscreen
                ? "전체 화면 종료"
                : "전체 화면으로 보기"
              : isFullscreen
                ? "Exit fullscreen"
                : "Enter fullscreen"
          }
        ></button>
      </div>
    </header>
  );
}
