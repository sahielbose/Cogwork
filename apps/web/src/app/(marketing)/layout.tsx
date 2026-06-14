import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingNav } from "@/components/marketing/nav";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="px-4">
        <MarketingNav />
      </div>
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
