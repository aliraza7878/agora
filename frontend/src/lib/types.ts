export type Accent = 'gold' | 'violet' | 'steel' | 'muted'
export interface Philosopher {
  id: string; name: string; school: string; era: string; accent: Accent; tagline: string; bio: string
  beliefs: string[]; arguments: string[]; works: string[]; strengths: string[]; style: string; personality_prompt: string
}
export interface Turn { index: number; round: number; stage: string; label: string; speaker: 'p1' | 'p2' }
export interface Msg {
  speaker: 'p1' | 'p2' | 'user'; content: string; round: number; stage?: string | null
  target?: 'p1' | 'p2' | 'both' | null; role?: string | null
}
export type Role = 'spectator' | 'advocate_p1' | 'advocate_p2' | 'independent'
export interface DebateConfig {
  topic: string; p1: string; p2: string; rounds: 3 | 5 | 7
  style: 'academic' | 'aggressive' | 'socratic' | 'formal'; model: string; user_role: Role
}
export interface Judgment {
  categories: Record<string, { p1: number; p2: number; rationale: string }>
  overall: { p1: number; p2: number }; winner: 'p1' | 'p2' | 'tie'
  strongest: { p1: string; p2: string }; weakest: { p1: string; p2: string }
  unanswered_questions: string[]; fallacies: { speaker: 'p1' | 'p2'; name: string; explanation: string }[]
  verdict: string; disclaimer: string; judge_model?: string
}
export interface Debate {
  id: string; created_at: string; config: DebateConfig; messages: Msg[]; nextTurn: number
  status: 'in_progress' | 'judging' | 'completed'; judgment?: Judgment
}
export interface Cap { supported: boolean; min?: number; max?: number; default?: number; max_items?: number }
export interface ModelInfo {
  id: string; owned_by?: string; context_window?: number; max_completion_tokens?: number
  active: boolean; deprecated: boolean; is_chat: boolean
  capabilities: {
    streaming: boolean; temperature: Cap; top_p: Cap; max_completion_tokens: Cap; stop: Cap
    frequency_penalty: Cap; presence_penalty: Cap; seed: Cap; json_mode: Cap
  }
}
export interface PromptItem { id: string; name: string; text: string; starter?: boolean; updated_at?: string }
export interface Params {
  temperature?: number; top_p?: number; max_completion_tokens?: number; stop?: string[]
  frequency_penalty?: number; presence_penalty?: number; seed?: number; json_mode: boolean
}
export interface Usage { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
