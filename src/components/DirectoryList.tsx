"use client";

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import {
  closestCenter,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
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
  workshopPublished: boolean;
  createdAt: string;
};

const UNFILED_ID = "__unfiled__";
const FOLDER_DROP_PREFIX = "folder-drop:";
const FOLDER_SORT_PREFIX = "folder-sort:";

function SortableRow({
  row,
  folders,
  currentUserId,
}: {
  row: DirectoryRow;
  folders: DirectoryFolder[];
  currentUserId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: row.id,
    data: { type: "item" },
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  async function remove() {
    const ownWork = row.ownerId === currentUserId;
    if (ownWork && row.workshopPublished && row.visibility === "public" && row.reviewStatus === "approved") {
      alert("这个作品已经上架到创意工坊。请先点击“转私有”，确认它不再公开展示后，才能从你的目录移除。移除时不会删除服务器文件，也不会影响其他用户已添加的引用。");
      return;
    }
    const warning = ownWork && !row.workshopPublished
      ? `确定删除自己的作品“${row.title}”？这会从服务器磁盘删除 HTML 文件，并清理所有用户目录里的引用。`
      : ownWork
        ? `从你的目录移除已上架过创意工坊的作品“${row.title}”？不会删除服务器磁盘文件，也不会影响其他用户已添加的引用。`
      : `从目录移除“${row.title}”？这是从创意工坊添加的引用，不会删除服务器磁盘文件。`;
    if (!window.confirm(warning)) return;
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
        <button className="btn-secondary h-9 px-3 text-red-700" onClick={remove}><Trash2 className="h-4 w-4" />{row.ownerId === currentUserId && !row.workshopPublished ? "删除作品" : "移除引用"}</button>
      </div>
    </div>
  );
}

type FolderGroup = {
  id: string;
  name: string;
  items: DirectoryRow[];
  virtual: boolean;
};

function FolderSection({
  group,
  folder,
  expanded,
  folders,
  currentUserId,
  folderSortingDisabled,
  onToggle,
  onRenameFolder,
  onDeleteFolder,
}: {
  group: FolderGroup;
  folder?: DirectoryFolder;
  expanded: boolean;
  folders: DirectoryFolder[];
  currentUserId: string;
  folderSortingDisabled: boolean;
  onToggle: () => void;
  onRenameFolder: (folder: DirectoryFolder) => void;
  onDeleteFolder: (folder: DirectoryFolder) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `${FOLDER_DROP_PREFIX}${group.id}` });
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef: setSortableNodeRef,
    transform,
    transition,
  } = useSortable({
    id: `${FOLDER_SORT_PREFIX}${group.id}`,
    data: { type: "folder" },
    disabled: group.virtual || folderSortingDisabled,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <div ref={setSortableNodeRef} style={style}>
      <div
        ref={setNodeRef}
        className={`flex w-full items-center gap-3 bg-paper px-4 py-4 text-left transition hover:bg-linen/70 ${isOver ? "bg-emerald-50 ring-2 ring-inset ring-emerald-400" : ""}`}
      >
        {folder && (
          <button
            className="shrink-0 cursor-grab touch-none text-ink/35 disabled:cursor-wait disabled:opacity-40 active:cursor-grabbing"
            {...attributes}
            {...listeners}
            disabled={folderSortingDisabled}
            aria-label={`拖拽排序文件夹“${folder.name}”`}
          >
            <GripVertical className="h-5 w-5" />
          </button>
        )}
        <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onToggle}>
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-ink/45" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink/45" />}
          <Folder className="h-4 w-4 shrink-0 text-moss" />
          <div className="min-w-0 flex-1">
            <div className="font-black">{group.name}</div>
            <div className="mt-1 text-sm text-ink/55">作品数：{group.items.length} · 可拖动作品到这里归类</div>
          </div>
        </button>
        {folder && (
          <span className="flex shrink-0 gap-2">
            <button className="btn-secondary h-8 px-3 text-xs" onClick={() => onRenameFolder(folder)}>改名</button>
            <button className="btn-secondary h-8 px-3 text-xs text-red-700" onClick={() => onDeleteFolder(folder)}>删除</button>
          </span>
        )}
      </div>
      {expanded && (
        <div className="border-t border-line bg-linen/35 p-3">
          {group.items.length === 0 ? (
            <div className={`rounded-md border border-dashed bg-paper p-5 text-center text-sm text-ink/55 ${isOver ? "border-emerald-400 bg-emerald-50/60" : "border-line"}`}>这个文件夹还没有作品，可以把动画拖到这里</div>
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
  const [orderedFolders, setOrderedFolders] = useState(folders);
  const [isSavingFolderOrder, setIsSavingFolderOrder] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const draggingFolder = args.active.data.current?.type === "folder";
    const droppableContainers = args.droppableContainers.filter((container) => {
      const folderTarget = String(container.id).startsWith(FOLDER_SORT_PREFIX);
      return draggingFolder ? folderTarget : !folderTarget;
    });
    return closestCenter({ ...args, droppableContainers });
  }, []);

  const folderGroups = useMemo(() => {
    const groups = [
      ...orderedFolders.map((folder) => ({ id: folder.id, name: folder.name, items: [] as DirectoryRow[], virtual: false })),
      { id: UNFILED_ID, name: "未归类", items: [] as DirectoryRow[], virtual: true },
    ];
    const groupMap = new Map(groups.map((group) => [group.id, group]));
    for (const item of items) {
      const key = item.folderId && groupMap.has(item.folderId) ? item.folderId : UNFILED_ID;
      groupMap.get(key)?.items.push(item);
    }
    return groups.filter((group) => !group.virtual || group.items.length > 0 || orderedFolders.length === 0);
  }, [orderedFolders, items]);

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
    if (active.data.current?.type === "folder") {
      if (isSavingFolderOrder) return;
      const activeId = String(active.id).slice(FOLDER_SORT_PREFIX.length);
      const overId = String(over.id).slice(FOLDER_SORT_PREFIX.length);
      const oldIndex = orderedFolders.findIndex((folder) => folder.id === activeId);
      const newIndex = orderedFolders.findIndex((folder) => folder.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const previousFolders = orderedFolders;
      const nextFolders = arrayMove(orderedFolders, oldIndex, newIndex);
      setOrderedFolders(nextFolders);
      setIsSavingFolderOrder(true);
      try {
        const response = await fetch("/api/directory/folders/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: nextFolders.map((folder) => folder.id) }),
        });
        if (response.ok) return;

        setOrderedFolders(previousFolders);
        const data = await response.json().catch(() => null);
        alert(data?.message || "保存文件夹排序失败，请重试。");
      } catch {
        setOrderedFolders(previousFolders);
        alert("保存文件夹排序失败，请检查网络后重试。");
      } finally {
        setIsSavingFolderOrder(false);
      }
      return;
    }

    const activeItem = items.find((item) => item.id === active.id);
    if (!activeItem) return;
    const overId = String(over.id);
    const activeFolder = activeItem.folderId || UNFILED_ID;
    if (overId.startsWith(FOLDER_DROP_PREFIX)) {
      const targetFolder = overId.slice(FOLDER_DROP_PREFIX.length);
      if (targetFolder === activeFolder) return;
      const folderId = targetFolder === UNFILED_ID ? null : targetFolder;
      setItems((prev) => prev.map((item) => item.id === activeItem.id ? { ...item, folderId } : item));
      await fetch(`/api/directory/${activeItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      return;
    }

    const overItem = items.find((item) => item.id === over.id);
    if (!overItem) return;
    const overFolder = overItem.folderId || UNFILED_ID;
    if (activeFolder !== overFolder) {
      const folderId = overItem.folderId;
      setItems((prev) => prev.map((item) => item.id === activeItem.id ? { ...item, folderId } : item));
      await fetch(`/api/directory/${activeItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      return;
    }

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
        <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragEnd={onDragEnd}>
          <div className="panel divide-y divide-line overflow-hidden">
            <SortableContext
              items={orderedFolders.map((folder) => `${FOLDER_SORT_PREFIX}${folder.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {folderGroups.map((group) => {
                const expanded = expandedFolders.has(group.id);
                const folder = orderedFolders.find((item) => item.id === group.id);
                return (
                  <FolderSection
                    key={group.id}
                    group={group}
                    folder={folder}
                    expanded={expanded}
                    folders={orderedFolders}
                    currentUserId={currentUserId}
                    folderSortingDisabled={isSavingFolderOrder}
                    onToggle={() => toggleFolder(group.id)}
                    onRenameFolder={renameFolder}
                    onDeleteFolder={deleteFolder}
                  />
                );
              })}
            </SortableContext>
          </div>
        </DndContext>
      )}
    </div>
  );
}
