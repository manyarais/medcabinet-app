// Assistant page — grounded Q&A over the household's actual Pillio records.

import { AssistantChat } from "@/components/AssistantChat";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default function AssistantPage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-6">
      <PageHeader
        title="Assistant"
        subtitle="Ask where things are, what's expiring, or what happened — answers come only from your Pillio records."
      />
      <AssistantChat />
    </main>
  );
}
