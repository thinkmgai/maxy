"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchAppSettings,
  createAppSetting,
  deleteAppSettings,
  updateAppSetting,
  type AppSetting,
} from "../../../api/PManagement/appSettings";

const SERVER_TYPE_OPTIONS = [
  { value: "0", label: "개발" },
  { value: "1", label: "Q/A" },
  { value: "2", label: "운영" },
];

const SERVER_TYPE_LABEL_MAP = SERVER_TYPE_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const getServerTypeLabel = (value: string | null | undefined) =>
  SERVER_TYPE_LABEL_MAP[value ?? ""] ?? "";

type AppSettingFormState = {
  appName: string;
  packageId: string;
  serverType: string;
  fullMsg: boolean;
  pageLogPeriod: number;
  loggingRate: number;
  order: number;
};

const INITIAL_FORM: AppSettingFormState = {
  appName: "",
  packageId: "",
  serverType: SERVER_TYPE_OPTIONS[0].value,
  fullMsg: true,
  pageLogPeriod: 7,
  loggingRate: 1,
  order: 1,
};

export default function AppSettingsPanel() {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [formState, setFormState] = useState<AppSettingFormState>(INITIAL_FORM);
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<number | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchAppSettings();
      const filtered = response.appSettings.filter((setting) => {
        if (!keyword.trim()) {
          return true;
        }
        const lowered = keyword.trim().toLowerCase();
        const serverTypeLabel = getServerTypeLabel(setting.serverType);
        return (
          setting.applicationId.toString().includes(lowered) ||
          setting.appName.toLowerCase().includes(lowered) ||
          setting.packageId.toLowerCase().includes(lowered) ||
          (setting.serverType ?? "").toLowerCase().includes(lowered) ||
          serverTypeLabel.toLowerCase().includes(lowered)
        );
      });
      setSettings(filtered);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "App 설정을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleSelection = (applicationId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(applicationId)) {
        next.delete(applicationId);
      } else {
        next.add(applicationId);
      }
      return next;
    });
  };

  const openModal = (setting?: AppSetting) => {
    if (setting) {
      setMode("edit");
      setEditingId(setting.applicationId);
      setFormState({
        appName: setting.appName,
        packageId: setting.packageId,
        serverType: setting.serverType,
        fullMsg: setting.fullMsg,
        pageLogPeriod: setting.pageLogPeriod,
        loggingRate: setting.loggingRate,
        order: setting.order,
      });
    } else {
      setMode("create");
      setEditingId(null);
      setFormState(INITIAL_FORM);
    }
    setIsModalOpen(true);
  };

  const openEditModal = (setting: AppSetting) => {
    setFormState({
      appName: setting.appName,
      packageId: setting.packageId,
      serverType: setting.serverType,
      fullMsg: setting.fullMsg,
      pageLogPeriod: setting.pageLogPeriod,
      loggingRate: setting.loggingRate,
      order: setting.order,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setFormState(INITIAL_FORM);
    setMode("create");
    setEditingId(null);
    setIsModalOpen(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      if (mode === "edit" && editingId != null) {
        await updateAppSetting({
          applicationId: editingId,
          appName: formState.appName,
          packageId: formState.packageId,
          serverType: formState.serverType,
          fullMsg: formState.fullMsg,
          pageLogPeriod: formState.pageLogPeriod,
          loggingRate: formState.loggingRate,
          order: formState.order,
        });
      } else {
        await createAppSetting(formState);
      }
      closeModal();
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "App 설정 등록에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) {
      return;
    }
    setIsSaving(true);
    try {
      await deleteAppSettings({ applicationIds: Array.from(selectedIds) });
      setSelectedIds(new Set());
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : "App 설정 삭제에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedList = useMemo(
    () => settings.filter((setting) => selectedIds.has(setting.applicationId)),
    [settings, selectedIds],
  );

  return (
    <div className="gm_user_panel">
      <header className="gm_user_panel__header">
        <div>
          <h2>App 설정</h2>
          <p>수집 대상 App을 등록하거나 삭제할 수 있습니다.</p>
        </div>
        <div className="gm_user_filters">
          <input
            type="search"
            placeholder="Application ID/이름 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </header>

      {error && <div className="gm_user_panel__error">{error}</div>}

      <div className="gm_user_panel__body">
        <section className="gm_user_panel__list">
          <div className="gm_user_panel__table_wrap">
            <div className="gm_user_toolbar gm_user_toolbar--bottom">
              <button
                type="button"
                className="icon_btn icon_btn--danger"
                onClick={handleDelete}
                disabled={selectedIds.size === 0}
                aria-label="선택 삭제"
                title="선택 삭제"
              >
                🗑
              </button>
              <span className="gm_user_toolbar__spacer" />
              <button
                type="button"
                className="icon_btn icon_btn--primary"
                onClick={() => openModal()}
                aria-label="App 등록"
                title="App 등록"
              >
                ＋
              </button>
              <button
                type="button"
                className="icon_btn"
                onClick={loadSettings}
                disabled={isLoading}
                aria-label="새로고침"
                title="새로고침"
              >
                ↻
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th className="gm_checkbox_cell">선택</th>
                  <th>App 이름</th>
                  <th>Package ID</th>
                  <th>Server Type</th>
                  <th>Full Msg</th>
                  <th>Page Log Period</th>
                  <th>Logging Rate</th>
                  <th>Order</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8}>로딩 중...</td>
                  </tr>
                ) : settings.length === 0 ? (
                  <tr>
                    <td colSpan={8}>등록된 App 설정이 없습니다.</td>
                  </tr>
                ) : (
                  settings.map((setting) => (
                    <tr key={setting.applicationId}>
                      <td className="gm_checkbox_cell">
                        <input
                          type="checkbox"
                          className="gm_checkbox"
                          checked={selectedIds.has(setting.applicationId)}
                          onChange={() => toggleSelection(setting.applicationId)}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="link_btn"
                          onClick={() => openModal(setting)}
                        >
                          {setting.appName}
                        </button>
                      </td>
                      <td>{setting.packageId}</td>
                      <td>{getServerTypeLabel(setting.serverType) || "-"}</td>
                      <td>{setting.fullMsg ? "Y" : "N"}</td>
                      <td>{setting.pageLogPeriod}일</td>
                      <td>{setting.loggingRate}</td>
                      <td>{setting.order}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedList.length > 0 && (
            <div className="gm_user_panel__selection_hint">
              선택된 App: {selectedList.map((setting) => setting.appName).join(", ")}
            </div>
          )}
        </section>
      </div>

      {isModalOpen && (
        <div className="gm_user_modal" role="dialog" aria-modal="true">
          <div className="gm_user_modal__backdrop" onClick={closeModal} />
          <div className="gm_user_modal__content">
            <div className="gm_user_modal__header">
              <strong>{mode === "edit" ? "App 수정" : "App 등록"}</strong>
              <button type="button" className="default_btn" onClick={closeModal}>
                닫기
              </button>
            </div>
            <form onSubmit={handleSubmit} className="gm_user_modal__form">
              <label>
                <span>App 이름</span>
                <input
                  type="text"
                  value={formState.appName}
                  onChange={(event) => setFormState((prev) => ({ ...prev, appName: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Package ID</span>
                <input
                  type="text"
                  value={formState.packageId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, packageId: event.target.value }))}
                  required
                />
              </label>
              <label>
                <span>Server Type</span>
                <select
                  value={formState.serverType}
                  onChange={(event) => setFormState((prev) => ({ ...prev, serverType: event.target.value }))}
                >
                  {SERVER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Full Message 수집</span>
                <select
                  value={formState.fullMsg ? "true" : "false"}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fullMsg: event.target.value === "true" }))
                  }
                >
                  <option value="true">사용</option>
                  <option value="false">사용 안함</option>
                </select>
              </label>
              <label>
                <span>Page Log Period (일)</span>
                <input
                  type="number"
                  min={1}
                  value={formState.pageLogPeriod}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, pageLogPeriod: Number(event.target.value) }))
                  }
                  required
                />
              </label>
              <label>
                <span>Logging Rate</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={formState.loggingRate}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, loggingRate: Number(event.target.value) }))
                  }
                  required
                />
              </label>
              <label>
                <span>표시 순서</span>
                <input
                  type="number"
                  min={1}
                  value={formState.order}
                  onChange={(event) => setFormState((prev) => ({ ...prev, order: Number(event.target.value) }))}
                  required
                />
              </label>
              <div className="gm_user_modal__actions">
              <button type="submit" className="primary_btn" disabled={isSaving}>
                {mode === "edit" ? "수정" : "등록"}
              </button>
                <button type="button" className="default_btn" onClick={closeModal}>
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
