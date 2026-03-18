import { Template, TemplateShape, CampaignData } from "./types";

export type { Template, TemplateShape, CampaignData };

const STORAGE_KEY = "campaign_templates_v1";
const MIGRATED_KEY = "campaign_templates_v1_migrated_to_db";

// Uses your existing api() helper if you have it.
// If not, replace with fetch(BASE_URL + path).
import { api } from "@/lib/api";
import { uploadFileToSpaces } from "./upload-client";

async function listTemplatesFromDb(brandId?: string): Promise<Template[]> {
  const q = brandId ? `?brand_id=${encodeURIComponent(brandId)}` : "";
  return api<Template[]>(`/templates`);
}

async function createTemplateInDb(t: Omit<Template, "id" | "createdAt" | "updatedAt"> & { brand_id?: string }) {
  return api<{ ok: boolean; template: { id: string } }>(`/templates`, {
    method: "POST",
    body: JSON.stringify({
      brand_id: t.brand_id,
      name: t.name,
      description: t.description,
      shapes: t.shapes,
      canvasWidth: t.canvasWidth,
      canvasHeight: t.canvasHeight,
      backgroundImage: t.backgroundImage ?? null,
      logoPlacement: t.logoPlacement ?? null,
    }),
  });
}

async function updateTemplateInDb(templateId: string, t: Omit<Template, "id" | "createdAt" | "updatedAt"> & { brand_id?: string }) {
  return api<{ ok: boolean; id: string; updated_at?: string }>(`/templates/${templateId}`, {
    method: "PATCH",
    body: JSON.stringify({
      brand_id: t.brand_id,
      name: t.name,
      description: t.description,
      shapes: t.shapes,
      canvasWidth: t.canvasWidth,
      canvasHeight: t.canvasHeight,
      backgroundImage: t.backgroundImage ?? null,
      logoPlacement: t.logoPlacement ?? null,
    }),
  });
}

async function deleteTemplateInDb(templateId: string) {
  return api<{ ok: boolean; deleted: boolean }>(`/templates/${templateId}`, {
    method: "DELETE",
  });
}

function dataUrlToFile(dataUrl: string, filename: string) {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

export async function createTemplate(payload: any) {
  return api<{ ok: boolean; id: string }>('/templates', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateTemplateFull(id: string, payload: any) {
  return api<{ ok: boolean }>('/templates/' + id, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function saveTemplateToDBWithThumbnail(opts: {
  brand_id?: string;
  name: string;
  description?: string;
  shapes: any[];
  canvasWidth: number;
  canvasHeight: number;
  backgroundImage?: string | null; // can be URL or dataURL
  logoPlacement?: any;             // may contain url (could be dataURL)
  thumbnailDataUrl: string;        // canvasRef.toDataURL("image/png")
}) {
  // 1) upload THUMBNAIL
  const thumbFile = dataUrlToFile(
    opts.thumbnailDataUrl,
    `template-thumb-${opts.name}-${Date.now()}.png`
  );
  const thumbnail_url = await uploadFileToSpaces(thumbFile);

  // 2) upload BACKGROUND (if it is a dataURL). If it's already a URL, keep it.
  let background_url: string | null = null;

  if (opts.backgroundImage) {
    if (opts.backgroundImage.startsWith("data:image")) {
      const bgFile = dataUrlToFile(
        opts.backgroundImage,
        `template-bg-${opts.name}-${Date.now()}.png`
      );
      background_url = await uploadFileToSpaces(bgFile);
    } else {
      // already a URL (Spaces or elsewhere)
      background_url = opts.backgroundImage;
    }
  }

  // 3) normalize logoPlacement url (never store base64)
  let logo_placement = opts.logoPlacement ?? null;
  if (logo_placement?.url && typeof logo_placement.url === "string") {
    if (logo_placement.url.startsWith("data:image")) {
      const logoFile = dataUrlToFile(
        logo_placement.url,
        `template-logo-${opts.name}-${Date.now()}.png`
      );
      const logoUrl = await uploadFileToSpaces(logoFile);
      logo_placement = { ...logo_placement, url: logoUrl };
    }
  }

  // 4) create template in DB (store URLS only)
  return api<{ ok: boolean; id: string }>("/templates", {
    method: "POST",
    body: JSON.stringify({
      brand_id: opts.brand_id ?? null,
      name: opts.name,
      description: opts.description ?? null,
      shapes: opts.shapes,
      canvasWidth: opts.canvasWidth,
      canvasHeight: opts.canvasHeight,

      // ✅ store URLs only
      background_url,
      logoPlacement: logo_placement,
      thumbnail_url,
    }),
  });
}
// --------------------
// Local read (only for migration / fallback)
// --------------------
function getTemplatesFromLocal(): Template[] {
  try {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading templates:", error);
    return [];
  }
}

function setTemplatesToLocal(templates: Template[]) {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {}
}

// --------------------
// One-time migration
// --------------------
async function migrateLocalToDbOnce(brandId?: string) {
  if (typeof window === "undefined") return;
  const already = localStorage.getItem(MIGRATED_KEY);
  if (already === "1") return;

  const local = getTemplatesFromLocal();
  if (!local.length) {
    localStorage.setItem(MIGRATED_KEY, "1");
    return;
  }

  try {
    // push each template to DB
    for (const t of local) {
      await createTemplateInDb({
        brand_id: (t as any).brand_id ?? brandId,
        name: t.name,
        description: t.description,
        shapes: t.shapes,
        canvasWidth: t.canvasWidth,
        canvasHeight: t.canvasHeight,
        backgroundImage: t.backgroundImage ?? null,
        logoPlacement: t.logoPlacement ?? null,
      });
    }
    localStorage.setItem(MIGRATED_KEY, "1");

    // optional: clear local to avoid confusion
    // localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn("Template migration failed, will retry later:", e);
    // do not mark migrated, so it can retry next time
  }
}

// --------------------
// Public API (same signatures, but now DB)
// NOTE: these are async now. If your app currently calls them sync,
// tell me and I’ll give you a non-breaking adapter.
// --------------------

export async function getTemplates(brandId?: string): Promise<Template[]> {
  await migrateLocalToDbOnce(brandId);
  try {
    return await listTemplatesFromDb(brandId);
  } catch (e) {
    // fallback (so app doesn't break during backend outages)
    return getTemplatesFromLocal();
  }
}

export async function saveTemplate(
  name: string,
  shapes: TemplateShape[],
  canvasWidth: number,
  canvasHeight: number,
  description?: string,
  backgroundImage?: string | null,
  logoPlacement?: Template["logoPlacement"],
  brandId?: string
): Promise<Template> {
  const now = new Date().toISOString();

  const draft: Omit<Template, "id"> = {
    name,
    description,
    shapes: JSON.parse(JSON.stringify(shapes)),
    canvasWidth,
    canvasHeight,
    backgroundImage: backgroundImage ?? null,
    logoPlacement,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const res = await createTemplateInDb({ ...(draft as any), brand_id: brandId });
    const id = res.template.id;

    return {
      ...(draft as any),
      id,
    } as Template;
  } catch (e) {
    // fallback to local (optional)
    const templates = getTemplatesFromLocal();
    const localTemplate: Template = {
      id: Date.now().toString(),
      ...(draft as any),
    };
    templates.push(localTemplate);
    setTemplatesToLocal(templates);
    return localTemplate;
  }
}

export type UpdateTemplatePayload = Partial<{
  brand_id: string | null;
  name: string;
  description: string | null;

  shapes: TemplateShape[];
  canvasWidth: number;
  canvasHeight: number;

  backgroundImage: string | null;
  logoPlacement: Template["logoPlacement"] | null;

  thumbnail_url: string | null;
  preview_url: string | null;
}>;

export function updateTemplate(id: string, payload: UpdateTemplatePayload) {
  return api<{ ok: boolean; id: string }>(`/templates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteTemplate(templateId: string): Promise<boolean> {
  try {
    const res = await deleteTemplateInDb(templateId);
    console.log("Delete response:", res);
    return !!res.ok;  // ← was res.deleted, backend returns {ok: true}
  } catch (e) {
    const templates = getTemplatesFromLocal();
    const filtered = templates.filter((t) => t.id !== templateId);
    if (filtered.length === templates.length) return false;
    setTemplatesToLocal(filtered);
    return true;
  }
}

export async function getTemplateById(templateId: string, brandId?: string): Promise<Template | null> {
  const list = await getTemplates(brandId);
  return list.find((t) => t.id === templateId) || null;
}

// Render logic stays the same
export function renderTemplateWithData(
  template: Template,
  campaignData: CampaignData,
  logoUrl?: string
): TemplateShape[] {
  return template.shapes.map((shape) => {
    const newShape = { ...shape };

    if ((newShape as any).dataField && newShape.type === "text") {
      const field = (newShape as any).dataField as string;
      let textContent = "";

      if (field.startsWith("bullet-")) {
        const bulletIndex = parseInt(field.split("-")[1]);
        textContent = campaignData.bullets[bulletIndex] || "";
      } else {
        textContent = (campaignData as any)[field] || "";
      }

      (newShape as any).resolvedText = textContent;
    }

    return newShape;
  });
}

export function exportTemplate(template: Template): string {
  return JSON.stringify(template, null, 2);
}

export function importTemplate(jsonString: string): Template | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data.id || !data.name || !Array.isArray(data.shapes)) return null;
    return data as Template;
  } catch {
    return null;
  }
}
