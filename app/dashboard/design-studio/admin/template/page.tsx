import { Metadata } from "next";
import { Suspense } from "react";
import EditorPage from "../../editor";

export const metadata: Metadata = {
  title: "Design Template - Admin",
  description: "Create and manage campaign templates",
  icons: ["/Neuroflow_AI_Logo.png"],
};

export default function TemplateDesignPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <EditorPage />
    </Suspense>
  );
}