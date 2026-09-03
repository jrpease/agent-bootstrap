// Dated champion table (July 2026). This object is the swap point when refreshing
// against the live leaderboards (artificialanalysis.ai/video, /image, llm-stats.com).
// Capability axes → champion:
//   text-in-image / char-consistency → gpt-image ; photoreal-hero → nano-banana
//   image-to-video / top-fidelity → seedance ; dialogue/human → veo ; budget-draft → kling
// Note: the native-audio axis (Omni Flash) is not wired — it is not a long-running
// generateVideos model, so the current geminiVideo adapter can't drive it. Follow-up.
export const ROUTES = {
  'nano-banana': { provider: 'gemini', kind: 'image', modelId: 'gemini-3-pro-image' },
  'gpt-image':   { provider: 'openai', kind: 'image', modelId: 'gpt-image-2' },
  'seedance':    { provider: 'fal',    kind: 'video', modelId: 'bytedance/seedance-2.0/text-to-video' },
  'kling':       { provider: 'fal',    kind: 'video', modelId: 'fal-ai/kling-video/v3/standard/text-to-video' },
  'veo':         { provider: 'gemini', kind: 'video', modelId: 'veo-3.1-generate-preview' },
}

export function route(model) {
  const r = ROUTES[model]
  if (!r) {
    throw new Error(`Unknown --model "${model}". Known: ${Object.keys(ROUTES).join(', ')}`)
  }
  return r
}
