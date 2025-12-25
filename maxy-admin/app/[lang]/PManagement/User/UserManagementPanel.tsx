"use client";

import { FormEvent, Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchManagementUsers,
  createManagementUser,
  updateManagementUser,
  deleteManagementUsers,
  type ManagementUser,
} from "../../../api/PManagement/user";
import { useUserSettings } from "@/components/usersettings/UserSettingsProvider";

const LEVEL_OPTIONS = [
  { value: 100, label: "수퍼관리자" },
  { value: 1, label: "관리자" },
  { value: 0, label: "일반" },
];
const GENERAL_LEVEL_VALUE = LEVEL_OPTIONS.find((option) => option.value === 0)?.value ?? 0;

type SortDirection = "asc" | "desc";
type SortKey = "userId" | "userName" | "email" | "level" | "status" | "updatedAt";

const STATUS_OPTIONS = [
  { value: 1, label: "Active" },
  { value: 0, label: "Inactive" },
];

type FormState = {
  userNo?: number;
  userId: string;
  userName: string;
  email: string;
  level: number;
  status: number;
  password: string;
  confirmPassword: string;
};

const BASE_INITIAL_FORM: FormState = {
  userId: "",
  userName: "",
  email: "",
  level: LEVEL_OPTIONS[0].value,
  status: STATUS_OPTIONS[0].value,
  password: "",
  confirmPassword: "",
};

const createInitialFormState = (levelOverride?: number): FormState => ({
  ...BASE_INITIAL_FORM,
  level: levelOverride ?? BASE_INITIAL_FORM.level,
});

export default function UserManagementPanel() {
  const [users, setUsers] = useState<ManagementUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [formState, setFormState] = useState<FormState>(() => createInitialFormState());
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState<number | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortState, setSortState] = useState<{ key: SortKey; direction: SortDirection }>({
    key: "userId",
    direction: "asc",
  });
  const { level: currentLevel, userNo: currentUserNoRaw } = useUserSettings();
  const currentUserLevel = typeof currentLevel === "number" ? currentLevel : null;
  const currentUserNo = typeof currentUserNoRaw === "number" ? currentUserNoRaw : null;
  const isLevelOneAdmin = currentUserLevel === 1;
  const createModalDefaultLevel = isLevelOneAdmin ? GENERAL_LEVEL_VALUE : BASE_INITIAL_FORM.level;

  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetchManagementUsers({
        keyword: keyword.trim() || undefined,
        status: statusFilter ?? undefined,
      });
      setUsers(response.users ?? []);
      setExpandedRows(new Set());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "사용자 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [keyword, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSelectRow = (user: ManagementUser) => {
    if (isLevelOneAdmin && currentUserNo != null && user.userNo === currentUserNo) {
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(user.userNo)) {
        next.delete(user.userNo);
      } else {
        next.add(user.userNo);
      }
      return next;
    });
  };

  const openCreateModal = () => {
    setMode("create");
    setFormState(createInitialFormState(createModalDefaultLevel));
    setIsModalOpen(true);
  };

  const handleEdit = (user: ManagementUser) => {
    setMode("edit");
    setFormState({
      userNo: user.userNo,
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      level: user.level,
      status: user.status,
      password: "",
      confirmPassword: "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setMode("create");
    setFormState(createInitialFormState(createModalDefaultLevel));
    setIsModalOpen(false);
  };

  const toggleSort = (key: SortKey) => {
    setSortState((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  };

  const filteredUsers = useMemo(() => {
    if (!isLevelOneAdmin || currentUserNo == null) {
      return users;
    }
    return users.filter(
      (user) => user.userNo === currentUserNo || (user.level !== 100 && user.level !== 1),
    );
  }, [users, isLevelOneAdmin, currentUserNo]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const allowedIds = new Set(filteredUsers.map((user) => user.userNo));
      let changed = false;
      const next = new Set<number>();
      prev.forEach((id) => {
        if (allowedIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [filteredUsers]);

  const sortedUsers = useMemo(() => {
    const copy = [...filteredUsers];
    copy.sort((a, b) => {
      const direction = sortState.direction === "asc" ? 1 : -1;
      let aValue: string | number = "";
      let bValue: string | number = "";
      switch (sortState.key) {
        case "level":
        case "status":
          aValue = a[sortState.key];
          bValue = b[sortState.key];
          break;
        default:
          aValue = (a[sortState.key] ?? "") as string;
          bValue = (b[sortState.key] ?? "") as string;
      }
      if (typeof aValue === "number" && typeof bValue === "number") {
        return (aValue - bValue) * direction;
      }
      return aValue.toString().localeCompare(bValue.toString()) * direction;
    });
    return copy;
  }, [filteredUsers, sortState]);

  const toggleExpandRow = (userNo: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(userNo)) {
        next.delete(userNo);
      } else {
        next.add(userNo);
      }
      return next;
    });
  };

  const renderGroupTree = (user: ManagementUser) => {
    if (!user.groups || user.groups.length === 0) {
      return <p className="gm_user_group_tree__empty">연결된 그룹이 없습니다.</p>;
    }
    return (
      <div className="gm_user_group_tree">
        {user.groups.map((group) => (
          <div key={group.group} className="gm_user_group_tree_card">
            <div className="gm_user_group_tree_header">
              <div>
                <span className="gm_user_group_badge">GROUP</span>
                <strong>{group.groupName}</strong>
              </div>
              <span className="gm_user_group_count">
                {group.applications?.length ?? 0}개의 Application
              </span>
            </div>
            {group.applications && group.applications.length > 0 ? (
              <div className="gm_user_group_tree_apps">
                {group.applications.map((app) => (
                  <span key={app.applicationId} className="gm_chip">
                    {app.appName}
                  </span>
                ))}
              </div>
            ) : (
              <p className="gm_user_group_tree__empty">연결된 Application이 없습니다.</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mode === "create" && formState.password !== formState.confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    setIsSaving(true);
    try {
      if (mode === "create") {
        const levelForCreation = isLevelOneAdmin ? GENERAL_LEVEL_VALUE : formState.level;
        await createManagementUser({
          userId: formState.userId,
          userName: formState.userName,
          email: formState.email,
          level: levelForCreation,
          status: formState.status,
          password: formState.password,
        });
      } else if (formState.userNo != null) {
        await updateManagementUser({
          userNo: formState.userNo,
          userName: formState.userName,
          email: formState.email,
          level: formState.level,
          status: formState.status,
        });
      }
      closeModal();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
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
      await deleteManagementUsers({ userNos: Array.from(selectedIds) });
      setSelectedIds(new Set());
      closeModal();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const levelOptionsForSelect =
    mode === "create" && isLevelOneAdmin
      ? LEVEL_OPTIONS.filter((option) => option.value === GENERAL_LEVEL_VALUE)
      : LEVEL_OPTIONS;
  const isLevelSelectDisabled = mode === "create" && isLevelOneAdmin;

  return (
    <div className="gm_user_panel">
      <header className="gm_user_panel__header">
        <div>
          <h2>사용자 등록/삭제</h2>
          <p>사용자를 추가하거나 정보를 수정하고 불필요한 계정을 정리하세요.</p>
        </div>
        <div className="gm_user_filters">
          <input
            type="search"
            placeholder="이름/아이디 검색"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select
            value={statusFilter ?? ""}
            onChange={(event) =>
              setStatusFilter(event.target.value === "" ? null : Number(event.target.value))
            }
          >
            <option value="">모든 상태</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
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
                onClick={openCreateModal}
                aria-label="사용자 등록"
                title="사용자 등록"
              >
                ＋
              </button>
              <button
                type="button"
                className="icon_btn"
                onClick={loadUsers}
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
                  <th aria-label="expand column"></th>
                  <th className="gm_checkbox_cell">선택</th>
                  <th>
                    <button type="button" className="gm_sort_header" onClick={() => toggleSort("userId")}>
                      ID
                      {sortState.key === "userId" && (
                        <span aria-hidden="true">{sortState.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="gm_sort_header" onClick={() => toggleSort("userName")}>
                      이름
                      {sortState.key === "userName" && (
                        <span aria-hidden="true">{sortState.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="gm_sort_header" onClick={() => toggleSort("email")}>
                      이메일
                      {sortState.key === "email" && (
                        <span aria-hidden="true">{sortState.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="gm_sort_header" onClick={() => toggleSort("level")}>
                      레벨
                      {sortState.key === "level" && (
                        <span aria-hidden="true">{sortState.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="gm_sort_header" onClick={() => toggleSort("status")}>
                      상태
                      {sortState.key === "status" && (
                        <span aria-hidden="true">{sortState.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                  <th>
                    <button type="button" className="gm_sort_header" onClick={() => toggleSort("updatedAt")}>
                      수정일
                      {sortState.key === "updatedAt" && (
                        <span aria-hidden="true">{sortState.direction === "asc" ? "▲" : "▼"}</span>
                      )}
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8}>로딩 중...</td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8}>등록된 사용자가 없습니다.</td>
                  </tr>
                ) : (
                  sortedUsers.map((user) => (
                    <Fragment key={user.userNo}>
                      <tr>
                        <td className="gm_expand_cell">
                          {user.groups && user.groups.length > 0 ? (
                            <button
                              type="button"
                              className="gm_expand_btn"
                              aria-expanded={expandedRows.has(user.userNo)}
                              onClick={() => toggleExpandRow(user.userNo)}
                            >
                              {expandedRows.has(user.userNo) ? "−" : "+"}
                            </button>
                          ) : null}
                        </td>
                        <td className="gm_checkbox_cell">
                          <input
                            type="checkbox"
                            className="gm_checkbox"
                            checked={selectedIds.has(user.userNo)}
                            onChange={() => handleSelectRow(user)}
                            disabled={isLevelOneAdmin && currentUserNo != null && user.userNo === currentUserNo}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="link_btn"
                          onClick={() => handleEdit(user)}
                        >
                          {user.userId}
                        </button>
                      </td>
                      <td>{user.userName}</td>
                      <td>{user.email}</td>
                        <td>{LEVEL_OPTIONS.find((opt) => opt.value === user.level)?.label ?? user.level}</td>
                        <td>
                          <span className={`status_badge status_${user.status === 1 ? "active" : "inactive"}`}>
                            {user.status === 1 ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>{user.updatedAt}</td>
                      </tr>
                      {expandedRows.has(user.userNo) && (
                        <tr className="gm_user_group_row">
                          <td></td>
                          <td colSpan={7}>{renderGroupTree(user)}</td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div className="gm_user_modal" role="dialog" aria-modal="true">
          <div className="gm_user_modal__backdrop" onClick={closeModal} />
          <div className="gm_user_modal__content">
            <div className="gm_user_modal__header">
              <strong>{mode === "create" ? "새 사용자 등록" : "사용자 수정"}</strong>
              <button type="button" className="default_btn" onClick={closeModal}>
                닫기
              </button>
            </div>
            <form onSubmit={handleSubmit} className="gm_user_modal__form">
              <label>
                <span>사용자 ID</span>
                <input
                  type="text"
                  value={formState.userId}
                  onChange={(event) => setFormState((prev) => ({ ...prev, userId: event.target.value }))}
                  required
                  disabled={mode === "edit"}
                />
              </label>
              <label>
                <span>이름</span>
                <input
                  type="text"
                  value={formState.userName}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, userName: event.target.value }))
                  }
                  required
                />
              </label>
              <label>
                <span>이메일</span>
                <input
                  type="email"
                  value={formState.email}
                  onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>
              {mode === "create" && (
                <>
                  <label>
                    <span>비밀번호</span>
                    <input
                      type="password"
                      value={formState.password}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, password: event.target.value }))
                      }
                      required
                    />
                  </label>
                  <label>
                    <span>비밀번호 확인</span>
                    <input
                      type="password"
                      value={formState.confirmPassword}
                      onChange={(event) =>
                        setFormState((prev) => ({ ...prev, confirmPassword: event.target.value }))
                      }
                      required
                    />
                  </label>
                </>
              )}
              <label>
                <span>레벨</span>
                <select
                  value={formState.level}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, level: Number(event.target.value) }))
                  }
                  disabled={isLevelSelectDisabled}
                >
                  {levelOptionsForSelect.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>상태</span>
                <select
                  value={formState.status}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, status: Number(event.target.value) }))
                  }
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="gm_user_modal__actions">
                <button type="submit" className="primary_btn" disabled={isSaving}>
                  {mode === "create" ? "등록" : "수정"}
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
