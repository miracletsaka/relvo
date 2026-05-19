import { api } from "@/lib/api";

export type DbComposedTemplate = {
  instanceId: string;
  requested_type: "campaign_composition";
  name: string;
  description: string;
  segment_type: string;
  internal_segment_type: string;
  segment_height: number;
  y: number;
  shapes: any[];
  picked_segments?: {
    id: string;
    segment_key: string;
    name: string;
  }[];
};

export async function composeRandomTemplateFromDb(
  templateFamily = "mixed-poster",
  sections: string[] = [],
) {
  const params = new URLSearchParams();

  params.set("template_family", templateFamily);

  if (sections.length > 0) {
    params.set("sections", sections.join(","));
  }

  return api<DbComposedTemplate>(
    `/template-segments/compose-random?${params.toString()}`,
  );
}