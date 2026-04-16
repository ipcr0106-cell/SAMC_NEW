import TopNav from "./TopNav";
import Sidebar from "./Sidebar";

interface AppLayoutProps {
  children: React.ReactNode;
  caseId?: string;
}

export default function AppLayout({ children, caseId }: AppLayoutProps) {
  return (
    <div className="h-full">
      <TopNav />
      <Sidebar caseId={caseId} />
      <main className="pt-14 pl-56 min-h-full">
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
