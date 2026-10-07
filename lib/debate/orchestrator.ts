import { isFatalJudgeError, judgeFinal, judgeSentence, judgeTurn } from "@/lib/jev/judge";
import type { CallStats, Evidence, SentenceJudgment } from "@/lib/jev/types";
import { isRetracted } from "@/lib/jev/verdict";
import { type Debater, type TurnUsage, streamDebaterTurn } from "@/lib/models/debater";
import {
  type FinalProbabilities,
  type JudgedSentence,
  type JudgedTurn,
  countVerdicts,
  scoreDebate,
} from "@/lib/scoring/score";
import { SIDES, type Side } from "@/lib/side";
import { median, sum } from "@/lib/stats";
import type { DebateEvent } from "./events";
import { type EvidencePack, evidenceForDebaters, evidenceForJudge } from "./packs";
import { debaterSystemPrompt, retractionNote, turnPrompt } from "./prompts";
import { createQueue } from "./queue";
import { splitSentences } from "./sentences";

export interface DebateConfig {
  pack: EvidencePack;
  pro: Debater;
  con: Debater;
  rounds: number;
  maxWords: number;
  strictMode: boolean;
  /** Fixes the order the judge reads the evidence in. */
  seed: number;
  signal?: AbortSignal;
}

const MAX_RESTARTS_PER_TURN = 2;
// A model that ignores the word cap is cut off here so one turn cannot run away with the judge bill.
const HARD_WORD_LIMIT_FACTOR = 2;

interface SentenceState {
  id: string;
  index: number;
  text: string;
  dropped: boolean;
  judged: JudgedSentence | null;
  settled: Promise<void>;
}

interface TurnState {
  id: string;
  side: Side;
  round: number;
  sentences: SentenceState[];
  nextIndex: number;
  restarts: number;
  streaming: boolean;
  rewindTarget: SentenceState | null;
  truncated: boolean;
  tokens: { input: number; output: number; reasoning: number };
  settled: Promise<void>;
}

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

class DebateRun {
  private readonly started = performance.now();
  private readonly judgeEvidence: Evidence;
  private readonly debaterEvidence: string;
  private readonly turns: TurnState[] = [];
  private readonly turnJudgments: JudgedTurn[] = [];
  private final: FinalProbabilities | null = null;
  private readonly calls: CallStats[] = [];
  private judgeErrors = 0;
  private fatal: unknown = null;
  private readonly background: Promise<void>[] = [];
  private readonly controller = new AbortController();
  private readonly signal: AbortSignal;
  private readonly attemptAborts = new Map<string, () => void>();

  constructor(
    private readonly config: DebateConfig,
    private readonly emit: (event: DebateEvent) => void,
  ) {
    this.judgeEvidence = evidenceForJudge(config.pack, config.seed);
    this.debaterEvidence = evidenceForDebaters(config.pack);
    this.signal = config.signal
      ? AbortSignal.any([config.signal, this.controller.signal])
      : this.controller.signal;
  }

  cancel(): void {
    this.controller.abort();
  }

  async play(): Promise<void> {
    for (let round = 1; round <= this.config.rounds; round++) {
      for (const side of SIDES) await this.speak(side, round);
    }
    await Promise.all(this.background);
    this.checkpoint();

    const final = await judgeFinal({
      motion: this.config.pack.motion,
      transcriptPro: this.transcript("PRO"),
      transcriptCon: this.transcript("CON"),
      signal: this.signal,
    });
    this.calls.push(final);
    this.final = { pro: final.pro, con: final.con, tie: final.tie };
    this.emitScore();
    this.emit({
      type: "final",
      verdict: { ...this.final, latencyMs: final.latencyMs, costUsd: final.costUsd },
      score: this.score(),
      stats: this.stats(),
    });
  }

  private checkpoint(): void {
    if (this.fatal !== null) throw this.fatal;
    this.signal.throwIfAborted();
  }

  private fail(error: unknown): void {
    this.fatal ??= error;
    this.controller.abort();
  }

  private async speak(side: Side, round: number): Promise<void> {
    const debater = side === "PRO" ? this.config.pro : this.config.con;
    const turn: TurnState = {
      id: `${side}-${round}`,
      side,
      round,
      sentences: [],
      nextIndex: 1,
      restarts: 0,
      streaming: false,
      rewindTarget: null,
      truncated: false,
      tokens: { input: 0, output: 0, reasoning: 0 },
      settled: Promise.resolve(),
    };
    this.turns.push(turn);
    this.emit({ type: "turn_start", turn: turn.id, side, round, model: debater.entry.label });

    let note: string | null = null;
    let kept = "";
    for (;;) {
      const retracted = await this.streamAttempt(turn, debater, kept, note);
      if (!retracted) break;

      const dropped = turn.sentences.filter((sentence) => sentence.index > retracted.index);
      for (const sentence of dropped) sentence.dropped = true;
      turn.sentences = turn.sentences.filter((sentence) => !sentence.dropped);
      turn.rewindTarget = null;
      this.emit({
        type: "rewind",
        turn: turn.id,
        retracted: retracted.id,
        dropped: dropped.map((sentence) => sentence.id),
        restarts: turn.restarts,
      });
      this.emitScore();
      kept = this.standingText(turn, retracted.index);
      note = retractionNote(retracted.text);
    }

    const delivered = turn.sentences.map((sentence) => sentence.text).join(" ");
    if (!delivered) throw new Error(`${debater.entry.label} wrote nothing for ${turn.id}.`);
    this.emit({
      type: "turn_end",
      turn: turn.id,
      words: wordCount(delivered),
      truncated: turn.truncated,
      tokens: turn.tokens,
    });

    turn.settled = Promise.all(turn.sentences.map((sentence) => sentence.settled)).then(() => undefined);
    this.background.push(this.judgeTurnOf(turn));
  }

  /** Streams one attempt at a turn. Returns the retracted sentence if the attempt was cut short to rewind. */
  private async streamAttempt(
    turn: TurnState,
    debater: Debater,
    kept: string,
    note: string | null,
  ): Promise<SentenceState | null> {
    const attempt = new AbortController();
    this.attemptAborts.set(turn.id, () => attempt.abort());
    const signal = AbortSignal.any([this.signal, attempt.signal]);
    turn.streaming = true;

    const systemPrompt = debaterSystemPrompt({
      side: turn.side,
      motion: this.config.pack.motion,
      maxWords: this.config.maxWords,
      evidence: this.debaterEvidence,
    });
    const stream = streamDebaterTurn(debater, {
      system: note ? `${systemPrompt}\n\n${note}` : systemPrompt,
      user: turnPrompt({
        side: turn.side,
        round: turn.round,
        rounds: this.config.rounds,
        prior: this.turns
          .filter((t) => t !== turn)
          .map((t) => ({
            side: t.side,
            round: t.round,
            text: t.sentences.map((sentence) => sentence.text).join(" "),
          })),
        kept: note ? kept : null,
        remainingWords: Math.max(20, this.config.maxWords - wordCount(kept)),
      }),
      signal,
    });

    let buffer = "";
    try {
      for await (const chunk of stream.text) {
        this.emit({ type: "token", turn: turn.id, text: chunk });
        buffer += chunk;
        const split = splitSentences(buffer, { final: false });
        buffer = split.rest;
        for (const text of split.sentences) this.addSentence(turn, text, split.rest);

        const written = sum(turn.sentences.map((sentence) => wordCount(sentence.text))) + wordCount(buffer);
        if (written > this.config.maxWords * HARD_WORD_LIMIT_FACTOR) {
          turn.truncated = true;
          attempt.abort();
        }
      }
    } catch (error) {
      if (!signal.aborted) throw error;
    }
    turn.streaming = false;
    this.attemptAborts.delete(turn.id);
    this.checkpoint();

    if (turn.rewindTarget) return turn.rewindTarget;
    if (turn.truncated) return null;

    for (const text of splitSentences(buffer, { final: true }).sentences) this.addSentence(turn, text, "");
    this.addUsage(turn, await stream.usage());
    return null;
  }

  private addUsage(turn: TurnState, usage: TurnUsage): void {
    turn.tokens.input += usage.inputTokens;
    turn.tokens.output += usage.outputTokens;
    turn.tokens.reasoning += usage.reasoningTokens;
  }

  private addSentence(turn: TurnState, text: string, rest: string): void {
    const index = turn.nextIndex++;
    const sentence: SentenceState = {
      id: `${turn.id}-${index}`,
      index,
      text,
      dropped: false,
      judged: null,
      settled: Promise.resolve(),
    };
    turn.sentences.push(sentence);
    this.emit({
      type: "sentence",
      id: sentence.id,
      turn: turn.id,
      side: turn.side,
      round: turn.round,
      index,
      text,
      rest,
    });

    sentence.settled = judgeSentence({
      motion: this.config.pack.motion,
      side: turn.side,
      sentence: text,
      evidence: this.judgeEvidence,
      signal: this.signal,
    }).then(
      (judgment) => this.onJudgment(turn, sentence, judgment),
      (error: unknown) => this.onJudgeFailure(sentence, turn.side, error),
    );
  }

  private onJudgment(turn: TurnState, sentence: SentenceState, judgment: SentenceJudgment): void {
    this.calls.push(judgment);
    if (sentence.dropped) return;

    sentence.judged = {
      side: turn.side,
      verdict: judgment.verdict,
      isClaim: judgment.isClaim,
      supported: judgment.supported,
      contradicts: judgment.contradicts,
    };
    const passage = judgment.passage
      ? this.config.pack.passages.find((candidate) => candidate.id === judgment.passage)
      : undefined;
    this.emit({
      type: "verdict",
      id: sentence.id,
      verdict: judgment.verdict,
      isClaim: judgment.isClaim,
      supported: judgment.supported,
      contradicts: judgment.contradicts,
      passage: passage ? { id: passage.id, text: passage.text } : null,
      latencyMs: judgment.latencyMs,
      inputTokens: judgment.inputTokens,
      costUsd: judgment.costUsd,
    });
    this.emitScore();

    const canRewind =
      this.config.strictMode &&
      isRetracted(judgment.verdict) &&
      turn.streaming &&
      turn.rewindTarget === null &&
      turn.restarts < MAX_RESTARTS_PER_TURN;
    if (canRewind) {
      turn.restarts++;
      turn.rewindTarget = sentence;
      this.attemptAborts.get(turn.id)?.();
    }
  }

  private onJudgeFailure(sentence: SentenceState, side: Side, error: unknown): void {
    if (this.signal.aborted) return;
    if (isFatalJudgeError(error)) return this.fail(error);

    this.judgeErrors++;
    if (sentence.dropped) return;
    sentence.judged = { side, verdict: "unjudged", isClaim: 0, supported: 0, contradicts: 0 };
    this.emit({
      type: "verdict",
      id: sentence.id,
      verdict: "unjudged",
      isClaim: 0,
      supported: 0,
      contradicts: 0,
      passage: null,
      latencyMs: 0,
      inputTokens: 0,
      costUsd: 0,
    });
    this.emitScore();
  }

  private async judgeTurnOf(turn: TurnState): Promise<void> {
    await turn.settled;
    const text = this.standingText(turn);
    if (!text || this.signal.aborted) return;

    let opponentTurn: string | null = null;
    if (turn.round >= 2) {
      const previousRound = turn.side === "PRO" ? turn.round - 1 : turn.round;
      const previous = this.turns.find((t) => t.side !== turn.side && t.round === previousRound);
      if (previous) {
        await previous.settled;
        opponentTurn = this.standingText(previous) || null;
      }
    }

    try {
      const judgment = await judgeTurn({
        motion: this.config.pack.motion,
        side: turn.side,
        turn: text,
        opponentTurn,
        evidence: this.judgeEvidence,
        signal: this.signal,
      });
      this.calls.push(judgment);
      this.turnJudgments.push({
        side: turn.side,
        round: turn.round,
        rebuts: judgment.rebuts,
        onMotion: judgment.onMotion,
        evidenceUse: judgment.evidenceUse,
      });
      this.emit({
        type: "turn_verdict",
        turn: turn.id,
        side: turn.side,
        round: turn.round,
        rebuts: judgment.rebuts,
        onMotion: judgment.onMotion,
        evidenceUse: judgment.evidenceUse,
        latencyMs: judgment.latencyMs,
        costUsd: judgment.costUsd,
      });
      this.emitScore();
    } catch (error) {
      if (this.signal.aborted) return;
      if (isFatalJudgeError(error)) return this.fail(error);
      this.judgeErrors++;
    }
  }

  /** The turn's sentences that were not retracted, optionally only those before an index. */
  private standingText(turn: TurnState, before = Number.POSITIVE_INFINITY): string {
    return turn.sentences
      .filter(
        (sentence) => sentence.index < before && !(sentence.judged && isRetracted(sentence.judged.verdict)),
      )
      .map((sentence) => sentence.text)
      .join(" ");
  }

  private transcript(side: Side): string {
    return this.turns
      .filter((turn) => turn.side === side)
      .map((turn) => ({ round: turn.round, text: this.standingText(turn) }))
      .filter((turn) => turn.text)
      .map((turn) => `Round ${turn.round}: ${turn.text}`)
      .join("\n\n");
  }

  private judgedSentences(): JudgedSentence[] {
    return this.turns.flatMap((turn) =>
      turn.sentences.flatMap((sentence) => (sentence.judged && !sentence.dropped ? [sentence.judged] : [])),
    );
  }

  private score() {
    return scoreDebate({ sentences: this.judgedSentences(), turns: this.turnJudgments, final: this.final });
  }

  private emitScore(): void {
    const { PRO, CON } = this.score();
    this.emit({ type: "score", PRO, CON });
  }

  private stats() {
    const judged = this.judgedSentences();
    const side = (which: Side) => {
      const turns = this.turns.filter((turn) => turn.side === which);
      return {
        counts: countVerdicts(judged, which),
        words: sum(turns.map((turn) => wordCount(turn.sentences.map((sentence) => sentence.text).join(" ")))),
        tokens: {
          input: sum(turns.map((turn) => turn.tokens.input)),
          output: sum(turns.map((turn) => turn.tokens.output)),
          reasoning: sum(turns.map((turn) => turn.tokens.reasoning)),
        },
      };
    };
    return {
      PRO: side("PRO"),
      CON: side("CON"),
      judge: {
        calls: this.calls.length,
        medianLatencyMs: median(this.calls.map((call) => call.latencyMs)),
        inputTokens: sum(this.calls.map((call) => call.inputTokens)),
        costUsd: sum(this.calls.map((call) => call.costUsd)),
        errors: this.judgeErrors,
      },
      wallMs: Math.round(performance.now() - this.started),
    };
  }
}

/** Plays one debate and yields its events as they happen, ending with `final` or throwing. */
export async function* runDebate(config: DebateConfig): AsyncGenerator<DebateEvent> {
  const queue = createQueue<DebateEvent>();
  const run = new DebateRun(config, queue.push);
  const finished = run.play().then(queue.close, queue.fail);
  try {
    yield* queue;
  } finally {
    run.cancel();
    await finished;
  }
}
