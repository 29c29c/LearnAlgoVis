"use client";

import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useState } from "react";

export type UserWork = {
  id: string;
  title: string;
  byteSize: number;
  visibility: "private" | "public";
};

export type UserWorkGroup = {
  userId: string;
  name: string;
  email: string;
  workCount: number;
  totalBytes: number;
  works: UserWork[];
};

function formatMb(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

export function UserWorksManager({ groups }: { groups: UserWorkGroup[] }) {
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [showAllUsers, setShowAllUsers] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toggleUser(userId: string) {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function showAll(userId: string) {
    setShowAllUsers((prev) => {
      const next = new Set(prev);
      next.add(userId);
      return next;
    });
  }

  async function deleteWork(work: UserWork) {
    if (!window.confirm(`确定删除作品“${work.title}”？这会从服务器磁盘删除 HTML，并清理所有目录引用。`)) return;
    setDeletingId(work.id);
    const response = await fetch(`/api/admin/animations/${work.id}`, { method: "DELETE" });
    setDeletingId(null);
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      alert(payload?.message || "删除失败");
      return;
    }
    window.location.reload();
  }

  return (
    <section className="panel overflow-hidden">
      <div className="border-b border-line p-4">
        <h2 className="text-lg font-black">用户作品管理</h2>
        <p className="mt-1 text-sm text-ink/55">按用户占用总大小排序；展开用户后默认显示前 5 个最大作品。</p>
      </div>
      <div className="divide-y divide-line">
        {groups.map((group) => {
          const expanded = expandedUsers.has(group.userId);
          const showAllWorks = showAllUsers.has(group.userId);
          const visibleWorks = showAllWorks ? group.works : group.works.slice(0, 5);
          const overLimit = group.totalBytes > 10 * 1024 * 1024;

          return (
            <div key={group.userId} className="bg-paper">
              <button
                className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-linen/70"
                onClick={() => toggleUser(group.userId)}
              >
                {expanded ? <ChevronDown className="h-4 w-4 text-ink/45" /> : <ChevronRight className="h-4 w-4 text-ink/45" />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-black">{group.name}</span>
                    <span className="text-sm text-ink/50">{group.email}</span>
                    {overLimit && <span className="rounded bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">超过10MB</span>}
                  </div>
                  <div className="mt-1 text-sm text-ink/60">
                    作品数：{group.workCount} · 总大小：{formatMb(group.totalBytes)}
                  </div>
                </div>
              </button>
              {expanded && (
                <div className="border-t border-line bg-linen/35 px-4 py-3">
                  <div className="space-y-2">
                    {visibleWorks.map((work) => (
                      <div key={work.id} className="flex flex-col gap-3 rounded-md border border-line bg-paper px-3 py-3 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <a className="truncate font-semibold hover:text-signal" href={`/preview/${work.id}`} target="_blank" rel="noreferrer">{work.title}</a>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink/60">
                            <span>大小：{formatMb(work.byteSize)}</span>
                            <span>
                              公开状态：
                              <span className={`ml-1 rounded px-2 py-0.5 text-xs font-semibold ${work.visibility === "public" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                {work.visibility === "public" ? "公开" : "私密"}
                              </span>
                            </span>
                          </div>
                        </div>
                        <button className="btn-danger h-9 px-3" disabled={deletingId === work.id} onClick={() => deleteWork(work)}>
                          <Trash2 className="h-4 w-4" />
                          {deletingId === work.id ? "删除中..." : "删除"}
                        </button>
                      </div>
                    ))}
                  </div>
                  {!showAllWorks && group.works.length > 5 && (
                    <button className="mt-3 w-full rounded-md border border-dashed border-line bg-paper px-3 py-2 text-sm font-semibold text-ink/60 hover:border-moss hover:text-moss" onClick={() => showAll(group.userId)}>
                      ………… 点击这里显示全部
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {groups.length === 0 && <div className="p-8 text-center text-sm text-ink/55">暂无用户作品</div>}
      </div>
    </section>
  );
}
