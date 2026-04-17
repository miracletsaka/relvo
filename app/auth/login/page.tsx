import JobslyLogin from "@/components/auth/login";
import { Suspense } from "react";

export default function HomePage() {
  return (
    <main>
      <Suspense fallback={<div>Loading...</div>}>
        <JobslyLogin />
      </Suspense>
      
    </main>
  );
}