// Singleton for Z-AI SDK to prevent memory leaks with Turbopack hot reload
let zaiInstance: any = null;
let zaiModule: any = null;

export async function getZAI() {
  if (!zaiInstance) {
    if (!zaiModule) {
      zaiModule = (await import("z-ai-web-dev-sdk")).default;
    }
    zaiInstance = await zaiModule.create();
  }
  return zaiInstance;
}
