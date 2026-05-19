import { api } from "@/lib/api";

type GeneratedSection = {
  instanceId: string;

  requested_type: string;

  name: string;
  description?: string;

  shapes: any[];

  segment_height?: number;
};

type SaveGeneratedSectionsArgs = {
  templateFamily: string;

  generationSource?: string;

  sections: GeneratedSection[];

  compatibleTones?: string[];

  compatibleCategories?: string[];

  tags?: string[];
};

export async function saveGeneratedSections({
  templateFamily,
  generationSource = "mixed-runtime-generation",

  sections,

  compatibleTones = [],
  compatibleCategories = [],

  tags = [],
}: SaveGeneratedSectionsArgs) {
  const results = await Promise.all(
    sections.map((section) =>
      api("/template-segments", {
        method: "POST",

        body: JSON.stringify({
          template_family: templateFamily,

          segment_key: section.requested_type,

          name: section.name,

          description:
            section.description ||
            `Generated ${section.requested_type} section.`,

          shapes_json: section.shapes,

          canvas_width: 1080,
          canvas_height: 1350,

          compatible_tones: compatibleTones,
          compatible_categories: compatibleCategories,

          generation_source: generationSource,

          tags: [
            ...tags,
            "generated",
            section.requested_type,
          ],
        }),
      }),
    ),
  );

  return results;
}