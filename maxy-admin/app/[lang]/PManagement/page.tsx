'use client';

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchManagementMenu,
  type ManagementMenuItem,
  type ManagementMenuSection,
} from "../../api/PManagement/menu";
import UserManagementPanel from "./User/UserManagementPanel";
import GroupManagementPanel from "./Group/GroupManagementPanel";
import AppSettingsPanel from "./AppSettings/AppSettingsPanel";
import { useUserSettings } from "@/components/usersettings/UserSettingsProvider";

const USER_MANAGEMENT_MENU_ID = 5;
const GROUP_MANAGEMENT_MENU_ID = 6;
const APP_SETTINGS_MENU_ID = 13;

type NormalizedMenuItem = ManagementMenuItem & {
  id: string;
  parentId: string;
  menuId?: number;
};

type NormalizedMenuSection = {
  id: string;
  label: string;
  iconClass: string;
  items: NormalizedMenuItem[];
};

const SESSION_KEY = "currentGroupManagementMenu";
const VERSION_LABEL = "v1.6.0";

const ICON_CLASS_MAP: Record<string, string> = {
  종합: "icon-gm-total",
  사용자: "icon-gm-user",
  장치: "icon-gm-device",
  스토어: "icon-gm-store",
  난독화: "icon-gm-obf",
  "AI Bot": "icon-gm-ai",
  "App 설정": "icon-gm-total",
  "예외 처리": "icon-gm-alarm",
  "배치 초회": "icon-gm-log",
  "시스템 로그": "icon-gm-log",
  "Access 로그": "icon-gm-log",
};

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "section";
}

function normalizeMenuSections(menu: ManagementMenuSection[]): NormalizedMenuSection[] {
  return (
    menu
      .map((section, sectionIndex) => {
        const sectionId = `GM${String(sectionIndex + 1).padStart(4, "0")}-${slugify(section.label)}`;
        const iconClass = ICON_CLASS_MAP[section.label] ?? "icon-gm-total";
        const rawItems = (section.items ?? []).filter((item) => item.status !== 0);
        const normalizedItems: NormalizedMenuItem[] = rawItems.map((item, itemIndex) => ({
          ...item,
          id: `${sectionId}-${String(itemIndex + 1).padStart(2, "0")}`,
          parentId: sectionId,
        }));

        if (normalizedItems.length === 0) {
          return null;
        }

        return {
          id: sectionId,
          label: section.label,
          iconClass,
          items: normalizedItems,
        };
      })
      .filter((section): section is NormalizedMenuSection => Boolean(section))
  );
}

export default function ManagementPage() {
  const searchParams = useSearchParams();
  const { level } = useUserSettings();
  const normalizedLevel = typeof level === "number" ? level : null;
  const levelKnown = normalizedLevel !== null;
  const hasManagementAccess = normalizedLevel === 100 || normalizedLevel === 1;
  const shouldBlockAccess = levelKnown && !hasManagementAccess;
  const requestedMenuId = useMemo(() => {
    const value = searchParams?.get("menuId");
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }, [searchParams]);

  const [menuSections, setMenuSections] = useState<NormalizedMenuSection[]>([]);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const initializedRef = useRef(false);

  const loadMenu = useCallback(
    async (signal?: AbortSignal) => {
      if (!hasManagementAccess || normalizedLevel == null) {
        setMenuSections([]);
        if (!signal?.aborted) {
          setIsLoading(false);
        }
        return;
      }
      try {
        setIsLoading(true);
        const response = await fetchManagementMenu({ level: normalizedLevel }, { signal });
        if (signal?.aborted) {
          return;
        }
        setMenuSections(normalizeMenuSections(response.menu ?? []));
        setError(null);
      } catch (err) {
        if (signal?.aborted) {
          return;
        }
        const message = err instanceof Error ? err.message : "메뉴 정보를 불러오지 못했습니다.";
        setError(message);
        setMenuSections([]);
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [hasManagementAccess, normalizedLevel],
  );

  useEffect(() => {
    if (!hasManagementAccess || normalizedLevel == null) {
      return;
    }
    const controller = new AbortController();
    loadMenu(controller.signal);
    return () => controller.abort();
  }, [loadMenu, hasManagementAccess, normalizedLevel]);

  useEffect(() => {
    if (!shouldBlockAccess) {
      return;
    }
    initializedRef.current = false;
    appliedMenuIdRef.current = null;
    setMenuSections([]);
    setActiveItemId(null);
    setExpandedSectionId(null);
    setError(null);
    setIsLoading(false);
  }, [shouldBlockAccess]);

  const appliedMenuIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (menuSections.length === 0) {
      initializedRef.current = false;
      appliedMenuIdRef.current = null;
      return;
    }

    const allItems = menuSections.flatMap((section) => section.items);
    const shouldApplyQuery =
      requestedMenuId != null && appliedMenuIdRef.current !== requestedMenuId;

    if (initializedRef.current && !shouldApplyQuery) {
      return;
    }

    let nextItem: NormalizedMenuItem | null = null;

    if (shouldApplyQuery) {
      nextItem =
        allItems.find((item) => item.menuId === requestedMenuId) ?? null;
    }

    if (!nextItem) {
      const storedId =
        typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_KEY) : null;
      const storedItem = storedId ? allItems.find((item) => item.id === storedId) : null;
      nextItem = storedItem ?? allItems[0] ?? null;
    }

    setActiveItemId(nextItem ? nextItem.id : null);
    setExpandedSectionId(nextItem ? nextItem.parentId : menuSections[0].id);
    initializedRef.current = true;

    if (shouldApplyQuery) {
      appliedMenuIdRef.current = requestedMenuId;
    }
  }, [menuSections, requestedMenuId]);

  useEffect(() => {
    if (typeof window === "undefined" || !activeItemId) {
      return;
    }
    window.sessionStorage.setItem(SESSION_KEY, activeItemId);
  }, [activeItemId]);

  const flatItems = useMemo(
    () => menuSections.flatMap((section) => section.items),
    [menuSections],
  );

  const activeItem = useMemo(
    () => flatItems.find((item) => item.id === activeItemId) ?? null,
    [flatItems, activeItemId],
  );

  const activeSection = useMemo(
    () => menuSections.find((section) => section.id === (activeItem?.parentId ?? "")) ?? null,
    [menuSections, activeItem],
  );

  const handleGroupClick = useCallback(
    (section: NormalizedMenuSection) => {
      setExpandedSectionId(section.id);

      const defaultItem = section.items[0] ?? null;
      if (!defaultItem) {
        setActiveItemId(null);
        return;
      }

      const isSingleInline = section.items.length === 1 && defaultItem.id.endsWith("-00");
      if (isSingleInline || !section.items.some((item) => item.id === activeItemId)) {
        setActiveItemId(defaultItem.id);
      }
    },
    [activeItemId],
  );

  const handleItemClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>, item: NormalizedMenuItem) => {
      event.preventDefault();
      event.stopPropagation();
      setActiveItemId(item.id);
      setExpandedSectionId(item.parentId);
    },
    [],
  );

  const handleRetry = useCallback(() => {
    initializedRef.current = false;
    setMenuSections([]);
    setActiveItemId(null);
    setExpandedSectionId(null);
    setError(null);
    loadMenu();
  }, [loadMenu]);

  const renderMenu = () =>
    menuSections.map((section) => {
      const isExpanded = section.id === expandedSectionId;
      const iconClass = `${section.iconClass}${isExpanded ? "" : " off"}`;
      const hasSingleInlineItem =
        section.items.length === 1 && section.items[0]?.id.endsWith("-00");
      const groupClasses = [
        "menu_group",
        isExpanded ? "selected" : "",
        hasSingleInlineItem ? "menu_item" : "",
      ]
        .filter(Boolean)
        .join(" ");

      return (
        <Fragment key={section.id}>
          <li
            id={section.id}
            className={groupClasses}
            data-nm={section.label}
            data-page={section.items[0]?.route ?? ""}
            onClick={() => handleGroupClick(section)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleGroupClick(section);
              }
            }}
          >
            <div className="menu_nm_wrap">
              <i className={iconClass} aria-hidden="true" />
              <h4>{section.label}</h4>
            </div>
            <div className="bar_wrap">
              <span className="bar" />
              <span className="bar" />
            </div>
          </li>
          {section.items.length > 0 && !hasSingleInlineItem && (
            <li
              className={`menu_detail${isExpanded ? " open" : ""}`}
              data-group={section.id}
            >
              {section.items.map((item) => (
                <a
                  key={item.id}
                  id={item.id}
                  href={item.route ?? "#"}
                  className={`menu_item${item.id === activeItemId ? " active" : ""}`}
                  data-nm={item.label}
                  data-parent={item.parentId}
                  data-page={item.route ?? ""}
                  onClick={(event) => handleItemClick(event, item)}
                >
                  {item.label}
                </a>
              ))}
            </li>
          )}
        </Fragment>
      );
    });

  const renderBodyContent = () => {
    if (!activeItem) {
      return <p className="gm_status">표시할 메뉴를 선택하세요.</p>;
    }

    if (activeItem.menuId === USER_MANAGEMENT_MENU_ID) {
      return <UserManagementPanel />;
    }

    if (activeItem.menuId === GROUP_MANAGEMENT_MENU_ID) {
      return <GroupManagementPanel />;
    }

    if (activeItem.menuId === APP_SETTINGS_MENU_ID) {
      return <AppSettingsPanel />;
    }

    return (
      <section className="gm_content_body">
        <div className="gm_content_description">
          <p>
            선택한 관리 항목을 React 기반 화면으로 이전하는 과정에서, 기존 Java 콘솔의 메뉴 구성을
            유지하기 위해 /PManagement/menu API를 통해 항목을 구성합니다.
          </p>
          <p>
            각 메뉴는 sessionStorage(<code>{SESSION_KEY}</code>)에 선택 상태를 보관하여 페이지를
            이동해도 마지막으로 작업하던 항목을 다시 열 수 있습니다.
          </p>
        </div>
        <div className="maxy_popup_common gm_popup_preview">
          <div>
            <h4>Preview</h4>
          </div>
          <div className="preview_wrap">
            <span>샘플 화면을 준비 중입니다.</span>
          </div>
        </div>
      </section>
    );
  };

  const renderContent = () => {
    if (!levelKnown) {
      return <p className="gm_status">권한 정보를 확인하는 중입니다...</p>;
    }
    if (isLoading && menuSections.length === 0) {
      return <p className="gm_status">관리 메뉴를 불러오는 중입니다...</p>;
    }
    if (error) {
      return (
        <div className="gm_status error">
          <p>{error}</p>
          <button type="button" className="search_button" onClick={handleRetry}>
            다시 시도
          </button>
        </div>
      );
    }
    const hideHeader =
      activeItem?.menuId === USER_MANAGEMENT_MENU_ID ||
      activeItem?.menuId === GROUP_MANAGEMENT_MENU_ID ||
      activeItem?.menuId === APP_SETTINGS_MENU_ID;
    return (
      <div className="gm_content">
        {!hideHeader && (
          <header className="gm_content_header">
            <span className="gm_content_badge">{activeSection?.label ?? "관리"}</span>
            <h2>{activeItem?.label ?? "관리"}</h2>
            {activeItem?.route && (
              <p className="gm_content_route">
                레거시 화면: <code>{activeItem.route}</code>
              </p>
            )}
            {activeItem?.route && (
              <button
                type="button"
                className="search_button"
                onClick={() => {
                  window.open(activeItem.route ?? "#", "_blank", "noopener,noreferrer");
                }}
              >
                레거시 콘솔 열기
              </button>
            )}
          </header>
        )}
        {renderBodyContent()}
      </div>
    );
  };

  if (shouldBlockAccess) {
    return (
      <div className="maxy_gm_wrap">
        <div className="right_side_wrap">
          <article className="maxy_contents_wrap">
            <div className="gm_status error">
              <p>관리 권한이 없는 계정입니다.</p>
              <p>계정 권한을 변경한 후 다시 로그인해 주세요.</p>
            </div>
          </article>
        </div>
      </div>
    );
  }

  if (!levelKnown) {
    return (
      <div className="maxy_gm_wrap">
        <div className="right_side_wrap">
          <article className="maxy_contents_wrap">
            <p className="gm_status">권한 정보를 확인하는 중입니다...</p>
          </article>
        </div>
      </div>
    );
  }

  return (
    <div className="maxy_gm_wrap">
      <div className="left_side_wrap">
        <div className="gm_title">
          <h1>Configuration</h1>
          <h4 data-t="management.title.sideMenu">관리 기능</h4>
        </div>
        <nav>
          <ul className="maxy_side_menu" id="managementSideMenu">
            {isLoading && menuSections.length === 0 ? <li>Loading...</li> : renderMenu()}
          </ul>
        </nav>
        <div className="ci_wrap" title={VERSION_LABEL}>
          <h5>Powered by&nbsp;</h5>
          <img src="/images/maxy/THINKM_CI.svg" alt="THINKM" />
        </div>
      </div>
      <div className="right_side_wrap">
        <article className="maxy_contents_wrap">{renderContent()}</article>
      </div>
    </div>
  );
}
