import { and, desc, eq, like, or } from "drizzle-orm";
import { Compass } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ActionButton } from "@/components/ActionButton";
import { db } from "@/db";
import { animations, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function WorkshopPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const where = q
    ? and(eq(animations.visibility, "public"), eq(animations.reviewStatus, "approved"), or(like(animations.title, `%${q}%`), like(animations.description, `%${q}%`)))
    : and(eq(animations.visibility, "public"), eq(animations.reviewStatus, "approved"));
  const rows = await db.select({
    id: animations.id,
    title: animations.title,
    description: animations.description,
    stylePreset: animations.stylePreset,
    createdAt: animations.createdAt,
    ownerId: animations.ownerId,
    ownerName: users.name,
  }).from(animations)
    .leftJoin(users, eq(animations.ownerId, users.id))
    .where(where)
    .orderBy(desc(animations.createdAt))
    .limit(60);

  return (
    <AppShell user={user}>
      <PageHeader
        title="创意工坊"
        description="浏览其他用户公开并审核通过的算法动画。添加到目录只会创建引用，不会复制服务器 HTML 文件。"
      />
      <form className="mb-5 flex gap-2">
        <input name="q" defaultValue={q} className="input max-w-md" placeholder="搜索算法、描述或作者" />
        <button className="btn-primary">搜索</button>
      </form>
      {rows.length === 0 ? (
        <div className="panel p-10 text-center">
          <Compass className="mx-auto h-10 w-10 text-ink/35" />
          <div className="mt-3 text-lg font-bold">还没有公开视频</div>
          <p className="mt-2 text-sm text-ink/60">公开作品需要管理员审核后才会出现在这里。</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <article key={row.id} className="panel flex min-h-64 flex-col overflow-hidden">
              <iframe src={`/preview/${row.id}`} sandbox="allow-scripts allow-downloads" className="h-40 w-full border-0 bg-white" title={row.title} />
              <div className="flex flex-1 flex-col p-4">
                <div className="text-lg font-black">{row.title}</div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-ink/65">{row.description || "作者没有填写描述。"}</p>
                <div className="mt-3 text-xs text-ink/50">作者：{row.ownerName || "未知用户"} · {row.createdAt.toLocaleDateString("zh-CN")}</div>
                <div className="mt-auto flex gap-2 pt-4">
                  <a className="btn-secondary flex-1" href={`/preview/${row.id}`} target="_blank" rel="noreferrer">预览</a>
                  <ActionButton className="btn-primary flex-1" endpoint="/api/directory/add" body={{ animationId: row.id }}>添加</ActionButton>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
