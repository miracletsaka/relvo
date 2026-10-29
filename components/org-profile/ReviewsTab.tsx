"use client";

import { useCallback, useEffect, useState } from "react";
import ReviewsManagerPage from "@/components/review-manager";
import { TabHeader } from "./shared";

export function ReviewsTab({ toast }: { toast: (ok: boolean, msg: string) => void }) {
  return (
    <div>
      <TabHeader title="Reviews" sub="Manage and feature customer reviews" />
      <ReviewsManagerPage />
    </div>
  );
}
