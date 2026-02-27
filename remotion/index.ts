// Used ONLY by Remotion CLI (npx remotion studio)
// Next.js never imports this directly
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);