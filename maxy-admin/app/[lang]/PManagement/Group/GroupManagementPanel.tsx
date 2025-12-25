"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchManagementGroups,
  createManagementGroup,
  deleteManagementGroups,
  fetchManagementGroupDetail,
  updateManagementGroup,
  type ManagementGroup,
} from "../../../api/PManagement/group";
import {
  fetchManagementUsers,
  type ManagementUser,
} from "../../../api/PManagement/user";
import {
  fetchAppSettings,
  type AppSetting,
} from "../../../api/PManagement/appSettings";
import { useUserSettings } from "@/components/usersettings/UserSettingsProvider";

type SortDirection = "asc" | "desc";
type UserSortKey = "userName" | "userId" | "level";
type AppSortKey = "appName" | "packageId";
type ModalMode = "create" | "edit";

const LEVEL_LABELS: Record<number, string> = {
  100: "수퍼관리자",
  1: "관리자",
  0: "일반",
};

const INITIAL_FORM = {
  groupName: "",
  groupDescription: "",
};

export default function GroupManagementPanel() {
  const [groups, setGroups] = useState<ManagementGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [keyword, setKeyword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formState, setFormState] = useState(INITIAL_FORM);
  const [selectedUserNos, setSelectedUserNos] = useState<number[]>([]);
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<number[]>([]);
  const [availableUsers, setAvailableUsers] = useState<ManagementUser[]>([]);
  const [availableApps, setAvailableApps] = useState<AppSetting[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const [userSort, setUserSort] = useState<{ key: UserSortKey; direction: SortDirection }>({
    key: "userName",
    direction: "asc",
  });
  const [appSort, setAppSort] = useState<{ key: AppSortKey; direction: SortDirection }>({
    key: "appName",
    direction: "asc",
  });
  const { level: currentLevel, userNo: currentUserNo } = useUserSettings();
  const isLevelOneAdmin = currentLevel === 1;
  const currentUserNoValue =
    typeof currentUserNo === "number"
      ? currentUserNo
      : typeof currentUserNo === "string" && currentUserNo.trim() !== ""
        ? Number(currentUserNo)
        : null;

  useEffect(() => {
    if (isLevelOneAdmin && selectedGroups.size > 0) {
      setSelectedGroups(new Set());
    }
  }, [isLevelOneAdmin, selectedGroups]);

  const loadResources = useCallback(async () => {
    try {
      const [userRes, appRes] = await Promise.all([
        fetchManagementUsers({}),
        fetchAppSettings(),
      ]);
      const users = (userRes.users ?? []).filter((user) => user.level !== 100);
      setAvailableUsers(users);
      setAvailableApps(appRes.appSettings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "그룹 등록 리소스를 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  const loadGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchManagementGroups({
        keyword: keyword.trim() || undefined,
      });
      setGroups(response.groups ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "그룹 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [keyword]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const toggleSelection = (groupId: number) => {
    if (isLevelOneAdmin) {
      return;
    }
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const openModal = (mode: ModalMode) => {
    setModalMode(mode);
    setSelectedUserNos([]);
    setSelectedApplicationIds([]);
    setEditingGroupId(null);
    setFormState(INITIAL_FORM);
    setIsModalOpen(true);
    loadResources();
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalMode("create");
    setEditingGroupId(null);
  };

  const openEditModal = async (groupId: number) => {
    try {
      const response = await fetchManagementGroupDetail(groupId);
      if (response.detail) {
          const detail = response.detail;
        setFormState({
          groupName: detail.groupName,
          groupDescription: detail.groupDescription ?? "",
        });
        setSelectedUserNos(detail.userNos ?? []);
        setSelectedApplicationIds(detail.applicationIds ?? []);
        setEditingGroupId(detail.group);
        setModalMode("edit");
        setIsModalOpen(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "그룹 상세 정보를 불러오지 못했습니다.");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.groupName.trim() || selectedUserNos.length === 0 || selectedApplicationIds.length === 0) {
      return;
    }
    setIsSaving(true);
    try {
      if (modalMode === "edit" && editingGroupId != null) {
        await updateManagementGroup({
          group: editingGroupId,
          groupName: formState.groupName.trim(),
          groupDescription: formState.groupDescription.trim(),
          userNos: selectedUserNos,
          applicationIds: selectedApplicationIds,
        });
      } else {
        await createManagementGroup({
          groupName: formState.groupName.trim(),
          groupDescription: formState.groupDescription.trim(),
          userNos: selectedUserNos,
          applicationIds: selectedApplicationIds,
        });
      }
      setFormState(INITIAL_FORM);
      setSelectedUserNos([]);
      setSelectedApplicationIds([]);
      await loadGroups();
      closeModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : "그룹 추가에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedGroups.size === 0) return;
    setIsSaving(true);
    try {
      await deleteManagementGroups({ groups: Array.from(selectedGroups) });
      setSelectedGroups(new Set());
      await loadGroups();
    } catch (err) {
      setError(err instanceof Error ? err.message : "그룹 삭제에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleUserSort = (key: UserSortKey) => {
    setUserSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const toggleAppSort = (key: AppSortKey) => {
    setAppSort((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const sortedUsers = useMemo(() => {
    const copy = [...availableUsers];
    copy.sort((a, b) => {
      const direction = userSort.direction === "asc" ? 1 : -1;
      if (userSort.key === "level") {
        return (a.level - b.level) * direction;
      }
      const aValue = (a[userSort.key] ?? "").toString();
      const bValue = (b[userSort.key] ?? "").toString();
      return aValue.localeCompare(bValue) * direction;
    });
    return copy;
  }, [availableUsers, userSort]);

  const sortedApps = useMemo(() => {
    const copy = [...availableApps];
    copy.sort((a, b) => {
      const direction = appSort.direction === "asc" ? 1 : -1;
      const key = appSort.key;
      const aValue = (a[key] ?? "").toString();
      const bValue = (b[key] ?? "").toString();
      return aValue.localeCompare(bValue) * direction;
    });
    return copy;
  }, [availableApps, appSort]);

  const selectedList = useMemo(
    () => groups.filter((group) => selectedGroups.has(group.group)),
    [groups, selectedGroups],
  );

  const renderChipList = (label: string, items: string[]) => {
    if (items.length === 0) {
      return null;
    }
    return (
      <div className="gm_chip_list">
        <span className="gm_chip_list__label">{label}</span>
        <div className="gm_chip_list__items">
          {items.map((item, index) => (
            <span key={`${item}-${index}`} className="gm_chip">
              {item}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const userMap = useMemo(() => new Map(availableUsers.map((user) => [user.userNo, user])), [availableUsers]);
  const appMap = useMemo(() => new Map(availableApps.map((app) => [app.applicationId, app])), [availableApps]);

  const toggleUser = (userNo: number) => {
    if (
      isLevelOneAdmin &&
      currentUserNoValue != null &&
      userNo === currentUserNoValue &&
      modalMode === "edit"
    ) {
      return;
    }
    setSelectedUserNos((prev) =>
      prev.includes(userNo) ? prev.filter((id) => id !== userNo) : [...prev, userNo],
    );
  };

  const toggleApplication = (applicationId: number) => {
    setSelectedApplicationIds((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId],
    );
  };

  const getLevelLabel = (level: number) => LEVEL_LABELS[level] ?? String(level);

  const selectedUserChips = useMemo(
    () =>
      selectedUserNos.map((id) => {
        const user = userMap.get(id);
        return user ? `${user.userName} (${user.userId})` : `${id}`;
      }),
    [selectedUserNos, userMap],
  );

  const selectedAppChips = useMemo(
    () =>
      selectedApplicationIds.map((id) => {
        const app = appMap.get(id);
        if (!app) {
          return `${id}`;
        }
        const pkg = app.packageId ? ` (${app.packageId})` : "";
        return `${app.appName}${pkg}`;
      }),
    [selectedApplicationIds, appMap],
  );

  const canSubmit =
    formState.groupName.trim().length > 0 &&
    selectedUserNos.length > 0 &&
    selectedApplicationIds.length > 0;

  return (
    <div className="gm_user_panel">
      {error && <div className="gm_user_panel__error">{error}</div>}
      <header className="gm_user_panel__header">
        <div>
          <h2>그룹 관리</h2>
          <p>그룹을 조회하고 추가/삭제할 수 있습니다.</p>
        </div>
        <div className="gm_user_filters">
          <input
            type="search"
            placeholder="그룹명 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
        </div>
      </header>

      <section className="gm_user_panel__list">
          <div className="gm_user_panel__table_wrap">
            <div className="gm_user_toolbar gm_user_toolbar--bottom">
              <button
                type="button"
                className="icon_btn icon_btn--danger"
                onClick={handleDelete}
                disabled={selectedGroups.size === 0 || isSaving}
                aria-label="선택 삭제"
                title="선택 삭제"
              >
                🗑
              </button>
              <span className="gm_user_toolbar__spacer" />
                <button
                  type="button"
                  className="icon_btn icon_btn--primary"
                  onClick={() => openModal("create")}
                  disabled={isLevelOneAdmin}
                  aria-label="그룹 추가"
                  title="그룹 추가"
                >
                  ＋
              </button>
              <button
                type="button"
                className="icon_btn"
                onClick={loadGroups}
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
                  <th></th>
                  <th>그룹명</th>
                  <th>설명</th>
                  <th>수정</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4}>로딩 중...</td>
                  </tr>
                ) : groups.length === 0 ? (
                  <tr>
                    <td colSpan={4}>등록된 그룹이 없습니다.</td>
                  </tr>
                ) : (
                  groups.map((group) => (
                    <tr key={group.group}>
                      <td>
                        <input
                          type="checkbox"
                          className="gm_checkbox"
                          checked={selectedGroups.has(group.group)}
                          onChange={() => toggleSelection(group.group)}
                          disabled={isLevelOneAdmin}
                        />
                      </td>
                      <td>{group.groupName}</td>
                      <td>{group.groupDescription || "-"}</td>
                      <td>
                        <button
                          type="button"
                          className="default_btn"
                          onClick={() => openEditModal(group.group)}
                        >
                          수정
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {selectedList.length > 0 && (
            <div className="gm_user_panel__selection_hint">
              선택된 그룹: {selectedList.map((group) => group.groupName).join(", ")}
            </div>
          )}
      </section>

      {isModalOpen && (
        <div className="gm_user_modal" role="dialog" aria-modal="true">
          <div className="gm_user_modal__backdrop" onClick={closeModal} />
          <div className="gm_user_modal__content gm_group_modal">
            <div className="gm_user_modal__header">
              <strong>{modalMode === "edit" ? "그룹 수정" : "새 그룹 등록"}</strong>
              <button type="button" className="default_btn" onClick={closeModal}>
                닫기
              </button>
            </div>
            <form onSubmit={handleSubmit} className="gm_group_form" aria-label="그룹 등록 폼">
              <label>
                <span>그룹 이름</span>
                <input
                  type="text"
                  value={formState.groupName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, groupName: event.target.value }))
                  }
                  placeholder="예: 운영 관리자"
                  required
                />
              </label>
              <label>
                <span>그룹 설명</span>
                <textarea
                  value={formState.groupDescription}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, groupDescription: event.target.value }))
                  }
                  placeholder="그룹에 대한 설명을 입력하세요."
                  rows={3}
                />
              </label>
              <div className="gm_group_select_grid">
                <div>
                  <div className="gm_group_select_header">
                    <h4>사용자 선택</h4>
                    <span>{selectedUserNos.length}명 선택</span>
                  </div>
                  <div className="gm_select_table_wrap">
                    <table className="gm_select_table">
                      <thead>
                        <tr>
                          <th>선택</th>
                          <th>
                            <button
                              type="button"
                              className="gm_sort_header"
                              onClick={() => toggleUserSort("userName")}
                            >
                              이름
                              {userSort.key === "userName" && (
                                <span aria-hidden="true">{userSort.direction === "asc" ? "▲" : "▼"}</span>
                              )}
                            </button>
                          </th>
                          <th>
                            <button
                              type="button"
                              className="gm_sort_header"
                              onClick={() => toggleUserSort("userId")}
                            >
                              아이디
                              {userSort.key === "userId" && (
                                <span aria-hidden="true">{userSort.direction === "asc" ? "▲" : "▼"}</span>
                              )}
                            </button>
                          </th>
                          <th>
                            <button
                              type="button"
                              className="gm_sort_header"
                              onClick={() => toggleUserSort("level")}
                            >
                              레벨
                              {userSort.key === "level" && (
                                <span aria-hidden="true">{userSort.direction === "asc" ? "▲" : "▼"}</span>
                              )}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedUsers.map((user) => (
                          <tr key={user.userNo}>
                            <td className="gm_checkbox_cell">
                              <input
                                type="checkbox"
                                className="gm_checkbox"
                                checked={selectedUserNos.includes(user.userNo)}
                                onChange={() => toggleUser(user.userNo)}
                                disabled={
                                  isLevelOneAdmin &&
                                  currentUserNoValue != null &&
                                  user.userNo === currentUserNoValue &&
                                  modalMode === "edit"
                                }
                              />
                            </td>
                            <td>{user.userName}</td>
                            <td>{user.userId}</td>
                            <td>{getLevelLabel(user.level)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderChipList("선택된 사용자", selectedUserChips)}
                </div>
                <div>
                  <div className="gm_group_select_header">
                    <h4>Application 선택</h4>
                    <span>{selectedApplicationIds.length}개 선택</span>
                  </div>
                  <div className="gm_select_table_wrap">
                    <table className="gm_select_table">
                      <thead>
                        <tr>
                          <th>선택</th>
                          <th>
                            <button
                              type="button"
                              className="gm_sort_header"
                              onClick={() => toggleAppSort("appName")}
                            >
                              App 이름
                              {appSort.key === "appName" && (
                                <span aria-hidden="true">{appSort.direction === "asc" ? "▲" : "▼"}</span>
                              )}
                            </button>
                          </th>
                          <th>
                            <button
                              type="button"
                              className="gm_sort_header"
                              onClick={() => toggleAppSort("packageId")}
                            >
                              Package ID
                              {appSort.key === "packageId" && (
                                <span aria-hidden="true">{appSort.direction === "asc" ? "▲" : "▼"}</span>
                              )}
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedApps.map((app) => (
                          <tr key={app.applicationId}>
                            <td className="gm_checkbox_cell">
                              <input
                                type="checkbox"
                                className="gm_checkbox"
                                checked={selectedApplicationIds.includes(app.applicationId)}
                                onChange={() => toggleApplication(app.applicationId)}
                              />
                            </td>
                            <td>{app.appName}</td>
                            <td>{app.packageId || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {renderChipList("선택된 Application", selectedAppChips)}
                </div>
              </div>
              <div className="gm_user_modal__actions">
                <button type="submit" className="primary_btn" disabled={!canSubmit || isSaving}>
                  {modalMode === "edit" ? "수정" : "완료"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
