import { AppShell } from "@/components/AppShell";
import { ImportTool } from "@/components/ImportTool";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";

export default async function ImportPage() {
  const user = await requireUser();
  return (
    <AppShell user={user}>
      <PageHeader
        title="导入与提示词"
        description="先用模板让大模型生成可审查的单文件 HTML，再粘贴导入。模板默认包含导出算法动画按钮。"
      />
      <ImportTool />
    </AppShell>
  );
}
