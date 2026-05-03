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
import { GripVertical, Trash2 } from "lucide-react";

export type DirectoryRow = {
  id: string;
  animationId: string;
  ownerId: string;
  title: string;
  ownerName: string;
  reviewStatus: string;
  visibility: string;
  createdAt: string;
};

function SortableRow({ row, currentUserId }: { row: DirectoryRow; currentUserId: string }) {
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

  async function setVisibility(visibility: "private" | "public") {
    await fetch(`/api/animations/${row.animationId}/visibility`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    window.location.reload();
  }

  return (
    <div ref={setNodeRef} style={style} className="grid gap-3 border-b border-line bg-paper p-4 last:border-b-0 md:grid-cols-[auto_1fr_auto] md:items-center">
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

export function DirectoryList({ rows, currentUserId }: { rows: DirectoryRow[]; currentUserId: string }) {
  const [items, setItems] = useState(rows);
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);
    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    await fetch("/api/directory/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((item) => item.id) }),
    });
  }

  if (items.length === 0) {
    return (
      <div className="panel p-10 text-center">
        <div className="text-lg font-bold">目录还是空的</div>
        <p className="mt-2 text-sm text-ink/60">先导入一个单 HTML 算法动画，或者从创意工坊添加别人公开的作品。</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="panel overflow-hidden">
          {items.map((row) => <SortableRow key={row.id} row={row} currentUserId={currentUserId} />)}
        </div>
      </SortableContext>
    </DndContext>
  );
}
