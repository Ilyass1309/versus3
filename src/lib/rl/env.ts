import { Action, State } from "./types";

export const MAX_HP = 20;
export const MAX_CHARGE = 3;
export const ATTACK_DAMAGE = 8;
export const MAX_TURNS = 60;

export function initialState(): State {
  return { pHP: MAX_HP, pCharge: 0, eHP: MAX_HP, eCharge: 0, turn: 0 };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Simule un tour simultané.
 * @param s état courant
 * @param aAI action de l'IA (0..2)
 * @param aPL action du joueur (0..2)
 * @returns next state, reward (pour l'IA), done
 */
export function stepWithPower(
  s: State,
  aAI: Action, nAI: number | undefined,
  aPL: Action, nPL: number | undefined
): { s2: State; r: number; done: boolean } {
  const { pHP, pCharge, eHP, eCharge, turn } = s;

  // Détermination des dépenses (p* = IA, e* = Player)
  const spendAI = aAI === Action.ATTACK ? clampInt((nAI ?? 1), 0, pCharge) : 0;
  const spendPL = aPL === Action.ATTACK ? clampInt((nPL ?? 1), 0, eCharge) : 0;

  // Dégâts bruts
  let dmgAItoPL = ATTACK_DAMAGE * spendAI;
  let dmgPLtoAI = ATTACK_DAMAGE * spendPL;

  // Défense (réduction par moitié, arrondi haut)
  if (aPL === Action.DEFEND) dmgAItoPL = Math.ceil(dmgAItoPL / 2);
  if (aAI === Action.DEFEND) dmgPLtoAI = Math.ceil(dmgPLtoAI / 2);

  // Consommation
  let nextPCharge = pCharge - spendAI;
  let nextECharge = eCharge - spendPL;

  // Charge
  if (aAI === Action.CHARGE) nextPCharge = clamp(nextPCharge + 1, 0, MAX_CHARGE);
  if (aPL === Action.CHARGE) nextECharge = clamp(nextECharge + 1, 0, MAX_CHARGE);

  // Clamp charges
  nextPCharge = clamp(nextPCharge, 0, MAX_CHARGE);
  nextECharge = clamp(nextECharge, 0, MAX_CHARGE);

  // HP
  const nextPHP = clamp(pHP - dmgPLtoAI, 0, MAX_HP);
  const nextEHP = clamp(eHP - dmgAItoPL, 0, MAX_HP);
  const nextTurn = turn + 1;

  const s2: State = { pHP: nextPHP, pCharge: nextPCharge, eHP: nextEHP, eCharge: nextECharge, turn: nextTurn };

  // Fin / reward identique
  let done = false;
  let r = 0;
  if (nextPHP <= 0 && nextEHP <= 0) { done = true; r = 0; }
  else if (nextEHP <= 0) { done = true; r = +1; }
  else if (nextPHP <= 0) { done = true; r = -1; }
  else if (nextTurn >= MAX_TURNS) {
    done = true;
    if (nextPHP > nextEHP) r = +1; else if (nextPHP < nextEHP) r = -1; else r = 0;
  }

  return { s2, r, done };
}

function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

// Wrapper rétro-compatible
export function step(
  s: State,
  aAI: Action,
  aPL: Action
): { s2: State; r: number; done: boolean } {
  const nAI = aAI === Action.ATTACK ? 1 : 0;
  const nPL = aPL === Action.ATTACK ? 1 : 0;
  return stepWithPower(s, aAI, nAI, aPL, nPL);
}

/** Encodage état -> clé Q-table (compacte et stable) */
export function encodeState(s: State): string {
  // "pHP-pCharge|eHP-eCharge|turn"
  return `${s.pHP}-${s.pCharge}|${s.eHP}-${s.eCharge}|${s.turn}`;
}

/** Décodage (utile si on stocke des états encodés côté client) */
export function decodeState(key: string): State {
  const [p, e, t] = key.split("|");
  const [pHP, pC] = (p ?? "0-0").split("-").map(Number);
  const [eHP, eC] = (e ?? "0-0").split("-").map(Number);
  const turn = Number(t);
  return {
    pHP: typeof pHP === "number" && !isNaN(pHP) ? pHP : 0,
    pCharge: typeof pC === "number" && !isNaN(pC) ? pC : 0,
    eHP: typeof eHP === "number" && !isNaN(eHP) ? eHP : 0,
    eCharge: typeof eC === "number" && !isNaN(eC) ? eC : 0,
    turn: typeof turn === "number" && !isNaN(turn) ? turn : 0,
  };
}
