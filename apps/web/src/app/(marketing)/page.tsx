import { FAQ } from "@/components/marketing/faq";
import { Hero } from "@/components/marketing/hero";
import {
  CommunityProof,
  ConversationalBuilder,
  FinalCTA,
  HowItWorks,
  OpenSource,
  WhyCogwork,
} from "@/components/marketing/sections";

export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <CommunityProof />
      <WhyCogwork />
      <ConversationalBuilder />
      <OpenSource />
      <FAQ />
      <FinalCTA />
    </>
  );
}
