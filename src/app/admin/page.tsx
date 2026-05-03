import { desc, eq } from "drizzle-orm";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { InviteCreator } from "@/components/InviteCreator";
import { ActionButton } from "@/components/ActionButton";
import { AiReviewButton } from "@/components/AiReviewButton";
import { db } from "@/db";
import { animations, inviteCodes, users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await requireAdmin();
  const pending = await db.select({
    id: animations.id,
    title: animations.title,
    description: animations.description,
    aiReviewStatus: animations.aiReviewStatus,
    createdAt: animations.createdAt,
    ownerName: users.name,
    ownerEmail: users.email,
  }).from(animations)
    .leftJoin(users, eq(animations.ownerId, users.id))
    .where(eq(animations.reviewStatus, "pending"))
    .orderBy(desc(animations.createdAt));

  const invites = await db.query.inviteCodes.findMany({ orderBy: desc(inviteCodes.createdAt), limit: 20 });

  const aiStatusLabel = {
    unreviewed: "未审核",
    ai_approved: "ai通过",
    ai_rejected: "ai不通过",
    manual_approved: "人工通过",
  } as const;

  return (
    <AppShell user={admin}>
      <PageHeader title="管理后台" description="创建邀请码、审核公开视频，并在必要时从服务器磁盘删除违规 HTML。" />
      <div className="space-y-6">
        <InviteCreator />
        <section className="panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-line p-4">
            <div>
              <h2 className="text-lg font-black">最近邀请码</h2>
              <p className="mt-1 text-sm text-ink/55">展示最近创建的 20 个邀请码及使用情况。</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="table-head"><tr><th className="p-3">标签</th><th className="p-3">使用</th><th className="p-3">过期</th></tr></thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-b border-line last:border-b-0">
                    <td className="p-3 font-medium">{invite.label || "未命名"}</td>
                    <td className="p-3">{invite.usedCount}/{invite.maxUses}</td>
                    <td className="p-3">{invite.expiresAt ? invite.expiresAt.toLocaleDateString("zh-CN") : "长期"}</td>
                  </tr>
                ))}
                {invites.length === 0 && <tr><td className="p-6 text-center text-ink/55" colSpan={3}>暂无邀请码</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel overflow-hidden">
          <div className="border-b border-line p-4">
            <h2 className="text-lg font-black">待审核作品</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse text-sm">
              <thead className="table-head">
                <tr><th className="p-3">作品</th><th className="p-3">作者</th><th className="p-3">时间</th><th className="p-3">AI状态</th><th className="p-3">操作</th></tr>
              </thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-b-0">
                    <td className="p-3">
                      <div className="font-bold">{row.title}</div>
                      <div className="mt-1 max-w-xl truncate text-ink/60">{row.description}</div>
                    </td>
                    <td className="p-3">{row.ownerName}<div className="text-xs text-ink/50">{row.ownerEmail}</div></td>
                    <td className="p-3">{row.createdAt.toLocaleString("zh-CN")}</td>
                    <td className="p-3">
                      <span className={`rounded px-2 py-1 text-xs font-semibold ${
                        row.aiReviewStatus === "ai_approved"
                          ? "bg-emerald-50 text-emerald-700"
                          : row.aiReviewStatus === "ai_rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-linen text-ink/60"
                      }`}>
                        {aiStatusLabel[row.aiReviewStatus as keyof typeof aiStatusLabel] || "未审核"}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <a className="btn-secondary h-9 px-3" href={`/preview/${row.id}`} target="_blank" rel="noreferrer">预览</a>
                        <ActionButton className="btn-primary h-9 px-3" endpoint={`/api/admin/animations/${row.id}/approve`}>通过</ActionButton>
                        <ActionButton className="btn-secondary h-9 px-3" endpoint={`/api/admin/animations/${row.id}/reject`} body={{ reason: "未通过审核" }}>拒绝</ActionButton>
                        <ActionButton className="btn-danger h-9 px-3" method="DELETE" endpoint={`/api/admin/animations/${row.id}`} confirmText="确定删除文件和所有引用？">删除</ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
                {pending.length === 0 && <tr><td className="p-6 text-center text-ink/55" colSpan={5}>暂无待审核作品</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end border-t border-line bg-linen/45 p-4">
            <AiReviewButton />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
