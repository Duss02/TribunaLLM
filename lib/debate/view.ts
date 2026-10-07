import type { JudgedVerdict } from "@/lib/jev/verdict";
import { isRetracted } from "@/lib/jev/verdict";
import type { Side } from "@/lib/side";
import { median } from "@/lib/stats";
import type { DebateEvent, FinalEvent } from "./events";

export interface SentenceView {
  id: string;
  text: string;
  status: JudgedVerdict | "pending";
  passage: { id: string; text: string } | null;
}

export interface TurnView {
  id: string;
  side: Side;
  round: number;
  model: string;
  sentences: SentenceView[];
  /** Text that has arrived but is not yet a confirmed sentence. */
  partial: string;
  ended: boolean;
}

export interface SideTotals {
  E: number;
  A: number;
  J: number;
  T: number;
}

export interface RecentVerdict {
  id: string;
  verdict: JudgedVerdict;
  text: string;
  latencyMs: number;
}

export interface ArenaState {
  status: "idle" | "running" | "done" | "error";
  turns: TurnView[];
  score: Record<Side, SideTotals> | null;
  final: FinalEvent | null;
  error: string | null;
  judged: number;
  retracted: number;
  contradicted: number;
  latencies: number[];
  costUsd: number;
  recent: RecentVerdict[];
  /** The last retraction that rewound a turn; `count` changes each time so the panel can flash again. */
  rewind: { count: number; text: string } | null;
}

export type ArenaAction = DebateEvent | { type: "reset" };

export const initialState: ArenaState = {
  status: "idle",
  turns: [],
  score: null,
  final: null,
  error: null,
  judged: 0,
  retracted: 0,
  contradicted: 0,
  latencies: [],
  costUsd: 0,
  recent: [],
  rewind: null,
};

export const medianLatencyMs = (state: ArenaState): number => median(state.latencies);

function mapTurn(state: ArenaState, id: string, change: (turn: TurnView) => TurnView): TurnView[] {
  return state.turns.map((turn) => (turn.id === id ? change(turn) : turn));
}

function findSentence(state: ArenaState, id: string): SentenceView | undefined {
  return state.turns.flatMap((turn) => turn.sentences).find((sentence) => sentence.id === id);
}

export function reduceArena(state: ArenaState, action: ArenaAction): ArenaState {
  switch (action.type) {
    case "reset":
      return { ...initialState, status: "running" };

    case "turn_start":
      return {
        ...state,
        turns: [
          ...state.turns,
          {
            id: action.turn,
            side: action.side,
            round: action.round,
            model: action.model,
            sentences: [],
            partial: "",
            ended: false,
          },
        ],
      };

    case "token":
      return {
        ...state,
        turns: mapTurn(state, action.turn, (turn) => ({ ...turn, partial: turn.partial + action.text })),
      };

    case "sentence":
      return {
        ...state,
        turns: mapTurn(state, action.turn, (turn) => ({
          ...turn,
          partial: action.rest,
          sentences: [
            ...turn.sentences,
            { id: action.id, text: action.text, status: "pending", passage: null },
          ],
        })),
      };

    case "verdict": {
      const text = findSentence(state, action.id)?.text ?? "";
      const recent = [
        { id: action.id, verdict: action.verdict, text, latencyMs: action.latencyMs },
        ...state.recent,
      ].slice(0, 5);
      return {
        ...state,
        turns: state.turns.map((turn) => ({
          ...turn,
          sentences: turn.sentences.map((sentence) =>
            sentence.id === action.id
              ? { ...sentence, status: action.verdict, passage: action.passage }
              : sentence,
          ),
        })),
        judged: state.judged + 1,
        retracted: state.retracted + (isRetracted(action.verdict) ? 1 : 0),
        contradicted: state.contradicted + (action.verdict === "contradicted" ? 1 : 0),
        latencies: action.verdict === "unjudged" ? state.latencies : [...state.latencies, action.latencyMs],
        costUsd: state.costUsd + action.costUsd,
        recent,
      };
    }

    case "turn_verdict":
      return {
        ...state,
        latencies: [...state.latencies, action.latencyMs],
        costUsd: state.costUsd + action.costUsd,
      };

    case "score":
      return { ...state, score: { PRO: action.PRO, CON: action.CON } };

    case "rewind": {
      const dropped = new Set(action.dropped);
      return {
        ...state,
        turns: mapTurn(state, action.turn, (turn) => ({
          ...turn,
          partial: "",
          sentences: turn.sentences.filter((sentence) => !dropped.has(sentence.id)),
        })),
        rewind: {
          count: (state.rewind?.count ?? 0) + 1,
          text: findSentence(state, action.retracted)?.text ?? "",
        },
      };
    }

    case "turn_end":
      return {
        ...state,
        turns: mapTurn(state, action.turn, (turn) => ({ ...turn, partial: "", ended: true })),
      };

    case "final":
      return {
        ...state,
        status: "done",
        final: action,
        costUsd: action.stats.judge.costUsd,
        score: { PRO: action.score.PRO, CON: action.score.CON },
      };

    case "error":
      return { ...state, status: "error", error: action.message };
  }
}
