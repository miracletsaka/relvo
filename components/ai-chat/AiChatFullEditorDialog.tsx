"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import type {
  CampaignData,
  TemplateShape,
} from "@/lib/types";
import EditorPage from "@/app/dashboard/design-studio/editor";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  campaignData: CampaignData;
  shapes: TemplateShape[];

  backgroundImage?: string | null;

  canvasWidth?: number;
  canvasHeight?: number;

  onSave?: (payload: {
    shapes: TemplateShape[];
    campaignData: CampaignData;
    backgroundImage?: string | null;
    canvasWidth?: number;
    canvasHeight?: number;
  }) => void;
};

export default function AiChatFullEditorDialog({
  open,
  onOpenChange,
  campaignData,
  shapes,
  backgroundImage,
  canvasWidth = 1080,
  canvasHeight = 1350,
  onSave,
}: Props) {
  const [localShapes, setLocalShapes] =
    useState<TemplateShape[]>([]);

  const [localCampaignData, setLocalCampaignData] =
    useState<CampaignData>(campaignData);

  const [localBackgroundImage, setLocalBackgroundImage] =
    useState<string | null>(
      backgroundImage || null,
    );

  useEffect(() => {
    if (!open) return;

    setLocalShapes(
      Array.isArray(shapes) ? shapes : [],
    );

    setLocalCampaignData(campaignData);

    setLocalBackgroundImage(
      backgroundImage || null,
    );
  }, [
    open,
    shapes,
    campaignData,
    backgroundImage,
  ]);

  const editorKey = useMemo(() => {
    return `${open}-${shapes.length}-${canvasWidth}-${canvasHeight}`;
  }, [
    open,
    shapes.length,
    canvasWidth,
    canvasHeight,
  ]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
          className="p-0 border-0 rounded-none bg-black"
          showCloseButton={true}
        >
        <div className="w-full h-full overflow-hidden">
          <EditorPage
            key={editorKey}
            initialBrandId={(campaignData as any)?.brand_id || undefined}
            initialToneId={(campaignData as any)?.tone_id || undefined}
            initialShapes={localShapes}
            initialCampaignData={
              localCampaignData
            }
            initialBackgroundImage={
              localBackgroundImage
            }
            initialCanvasWidth={canvasWidth}
            initialCanvasHeight={canvasHeight}
            embeddedMode
            onSaveTemplateState={(payload: any) => {
              setLocalShapes(payload.shapes);
              setLocalCampaignData(
                payload.campaignData,
              );

              setLocalBackgroundImage(
                payload.backgroundImage ||
                  null,
              );

              onSave?.({
                shapes: payload.shapes,
                campaignData:
                  payload.campaignData,
                backgroundImage:
                  payload.backgroundImage,
                canvasWidth:1080,
                canvasHeight:1350,
              });
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}