export async function composeRandomTemplateFromDb(
  templateFamily: string,
  sections: string[],
) {
  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

  const res = await fetch(
    `${API_BASE}/design-studio/templates/compose`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_family: templateFamily,
        sections,
      }),
    },
  );

  if (!res.ok) {
    throw new Error("Failed to compose template");
  }

  return res.json();
}

export function getComposedShapes(composed: any) {
  if (!composed) return [];

  if (Array.isArray(composed.shapes)) {
    return composed.shapes;
  }

  if (Array.isArray(composed.segments)) {
    return composed.segments.flatMap(
      (segment: any) => segment.shapes || [],
    );
  }

  return [];
}
