"use client";

import { useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronRight, Folder, FolderPlus, GripVertical, Trash2 } from "lucide-react";

export type DirectoryFolder = {
  id: string;
  name: string;
};

export type DirectoryRow = {
  id: string;
  animationId: string;
  folderId: string | null;
  ownerId: string;
  title: string;
  ownerName: string;
  reviewStatus: string;
  visibility: string;
  createdAt: string;
};

const UNFILED_ID = "__unfiled__";

function SortableRow({
  row,
  folders,
  currentUserId,
}: {
  row: DirectoryRow;
  folders: DirectoryFolder[];
  currentUserId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: row.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  async function remove() {
    if (!window.confirm("从目录移除？不会删除原始动画文件。")) return;
    await fetch(`/api/directory/${row.id}`, { method: "DELETE" });
    window.location.reload();
  }

  async function rename() {
    const next = window.prompt("自定义目录标题", row.title);
    if (next === null) return;
    await fetch(`/api/directory/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customTitle: next }),
    });
    window.location.reload();
  }

  async function moveToFolder(folderId: string) {
    await fetch(`/api/directory/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folderId: folderId === UNFILED_ID ? null : folderId }),
    });
    window.location.reload();
  }

  async function setVisibility(visibility: "private" | "public") {
    await fetch(`/api/animations/${row.animationId}/visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    window.location.reload();
  }

  return (
    <div ref={setNodeRef} style={style} className="grid gap-3 rounded-md border border-line bg-paper p-4 md:grid-cols-[auto_1fr_auto] md:items-center">
      <button className="hidden cursor-grab text-ink/35 md:block" {...attributes} {...listeners} aria-label="拖拽排序">
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <a className="truncate text-base font-bold hover:text-signal" href={`/preview/${row.animationId}`} target="_blank" rel="noreferrer">{row.title}</a>
          <span className="rounded bg-linen px-2 py-1 text-xs text-ink/60">{row.visibility === "public" ? row.reviewStatus : "private"}</span>
        </div>
        <div className="mt-1 text-sm text-ink/55">作者：{row.ownerName} · 添加于 {row.createdAt}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <select className="input h-9 w-auto py-1 text-xs" value={row.folderId || UNFILED_ID} onChange={(event) => moveToFolder(event.target.value)}>
          <option value={UNFILED_ID}>未归类</option>
          {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
        </select>
        {row.ownerId === currentUserId && (
          row.visibility === "public"
            ? <button className="btn-secondary h-9 px-3" onClick={() => setVisibility("private")}>转私有</button>
            : <button className="btn-secondary h-9 px-3" onClick={() => setVisibility("public")}>申请公开</button>
        )}
        <button className="btn-secondary h-9 px-3" onClick={rename}>改名</button>
        <button className="btn-secondary h-9 px-3 text-red-700" onClick={remove}><Trash2 className="h-4 w-4" />移除</button>
      </div>
    </div>
  );
}

export function DirectoryList({
  rows,
  folders,
  currentUserId,
}: {
  rows: DirectoryRow[];
  folders: DirectoryFolder[];
  currentUserId: string;
}) {
  const [items, setItems] = useState(rows);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const folderGroups = useMemo(() => {
    const groups = [
      ...folders.map((folder) => ({ id: folder.id, name: folder.name, items: [] as DirectoryRow[], virtual: false })),
      { id: UNFILED_ID, name: "未归类", items: [] as DirectoryRow[], virtual: true },
    ];
    const groupMap = new Map(groups.map((group) => [group.id, group]));
    for (const item of items) {
      const key = item.folderId && groupMap.has(item.folderId) ? item.folderId : UNFILED_ID;
      groupMap.get(key)?.items.push(item);
    }
    return groups.filter((group) => !group.virtual || group.items.length > 0 || folders.length === 0);
  }, [folders, items]);

  async function createFolder(formData: FormData) {
    const name = String(formData.get("name") || "").trim();
    if (!name) return;
    const response = await fetch("/api/directory/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      alert(data?.message || "创建文件夹失败");
      return;
    }
    window.location.reload();
  }

  async function renameFolder(folder: DirectoryFolder) {
    const name = window.prompt("文件夹名称", folder.name);
    if (!name) return;
    await fetch(`/api/directory/folders/${folder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    window.location.reload();
  }

  async function deleteFolder(folder: DirectoryFolder) {
    if (!window.confirm(`删除文件夹“${folder.name}”？文件夹内的目录项会移动到“未归类”，不会删除动画。`)) return;
    await fetch(`/api/directory/folders/${folder.id}`, { method: "DELETE" });
    window.location.reload();
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeItem = items.find((item) => item.id === active.id);
    const overItem = items.find((item) => item.id === over.id);
    if (!activeItem || !overItem) return;
    const activeFolder = activeItem.folderId || UNFILED_ID;
    const overFolder = overItem.folderId || UNFILED_ID;
    if (activeFolder !== overFolder) return;

    const folderItems = items.filter((item) => (item.folderId || UNFILED_ID) === activeFolder);
    const oldIndex = folderItems.findIndex((item) => item.id === active.id);
    const newIndex = folderItems.findIndex((item) => item.id === over.id);
    const nextFolderItems = arrayMove(folderItems, oldIndex, newIndex);
    const nextIds = nextFolderItems.map((item) => item.id);
    setItems((prev) => {
      const queue = [...nextFolderItems];
      return prev.map((item) => ((item.folderId || UNFILED_ID) === activeFolder ? queue.shift() ?? item : item));
    });
    await fetch("/api/directory/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: nextIds }),
    });
  }

  return (
    <div className="space-y-4">
      <form action={createFolder} className="panel flex flex-col gap-3 p-4 md:flex-row md:items-end">
        <label className="block flex-1 text-sm font-semibold">
          新建文件夹
          <input name="name" className="input mt-1" placeholder="例如 排序算法、图算法、数据结构" maxLength={40} />
        </label>
        <button className="btn-primary">
          <FolderPlus className="h-4 w-4" />
          添加文件夹
        </button>
      </form>

      {items.length === 0 && folders.length === 0 ? (
        <div className="panel p-10 text-center">
          <div className="text-lg font-bold">目录还是空的</div>
          <p className="mt-2 text-sm text-ink/60">先导入一个单 HTML 算法动画，或者从创意工坊添加别人公开的作品。</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <div className="panel divide-y divide-line overflow-hidden">
            {folderGroups.map((group) => {
              const expanded = expandedFolders.has(group.id);
              const folder = folders.find((item) => item.id === group.id);
              return (
                <div key={group.id}>
                  <button className="flex w-full items-center gap-3 bg-paper px-4 py-4 text-left transition hover:bg-linen/70" onClick={() => toggleFolder(group.id)}>
                    {expanded ? <ChevronDown className="h-4 w-4 text-ink/45" /> : <ChevronRight className="h-4 w-4 text-ink/45" />}
                    <Folder className="h-4 w-4 text-moss" />
                    <div className="min-w-0 flex-1">
                      <div className="font-black">{group.name}</div>
                      <div className="mt-1 text-sm text-ink/55">作品数：{group.items.length}</div>
                    </div>
                    {folder && (
                      <span className="flex gap-2" onClick={(event) => event.stopPropagation()}>
                        <button className="btn-secondary h-8 px-3 text-xs" onClick={() => renameFolder(folder)}>改名</button>
                        <button className="btn-secondary h-8 px-3 text-xs text-red-700" onClick={() => deleteFolder(folder)}>删除</button>
                      </span>
                    )}
                  </button>
                  {expanded && (
                    <div className="border-t border-line bg-linen/35 p-3">
                      {group.items.length === 0 ? (
                        <div className="rounded-md border border-dashed border-line bg-paper p-5 text-center text-sm text-ink/55">这个文件夹还没有作品</div>
                      ) : (
                        <SortableContext items={group.items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                          <div className="space-y-2">
                            {group.items.map((row) => (
                              <SortableRow key={row.id} row={row} folders={folders} currentUserId={currentUserId} />
                            ))}
                          </div>
                        </SortableContext>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}
