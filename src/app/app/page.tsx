import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { directoryItems, users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { DirectoryList } from "@/components/DirectoryList";
import { PageHeader } from "@/components/PageHeader";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const user = await requireUser();
  const rows = await db.query.directoryItems.findMany({
    where: eq(directoryItems.userId, user.id),
    orderBy: asc(directoryItems.sortOrder),
    with: { animation: true },
  });
  const ownerIds = Array.from(new Set(rows.map((row) => row.animation.ownerId)));
  const owners = ownerIds.length ? await db.select().from(users) : [];
  const ownerMap = new Map(owners.map((owner) => [owner.id, owner.name]));

  return (
    <AppShell user={user}>
      <PageHeader
        title="我的算法目录"
        description="这里保存你自己的动画和从创意工坊添加的引用。拖拽可以调整顺序，移除目录项不会删除服务器上的原始 HTML。"
        action={<Link href="/import" className="btn-primary">导入动画</Link>}
      />
      <DirectoryList rows={rows.map((row) => ({
        id: row.id,
        animationId: row.animationId,
        ownerId: row.animation.ownerId,
        title: row.customTitle || row.animation.title,
        ownerName: ownerMap.get(row.animation.ownerId) || "未知用户",
        reviewStatus: row.animation.reviewStatus,
        visibility: row.animation.visibility,
        createdAt: row.createdAt.toLocaleDateString("zh-CN"),
      }))} currentUserId={user.id} />
    </AppShell>
  );
}
