import { Action, State } from "./types";

export const MAX_HP = 30;
export const MAX_CHARGE = 3;
export const ATTACK_DAMAGE = 6;
export const MAX_TURNS = 60;

export function initialState(): State {
  return { pHP: MAX_HP, pCharge: 0, eHP: MAX_HP, eCharge: 0, turn: 0 };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function resolveDamage(attackerCharge: number, defenderAction: Action): number {
  const base = attackerCharge > 0 ? ATTACK_DAMAGE : 0;
  if (defenderAction === Action.DEFEND) {
    return Math.ceil(base / 2);
  }
  return base;
}

/**
 * Simule un tour simultané.
 * @param s état courant
 * @param aAI action de l'IA (0..2)
 * @param aPL action du joueur (0..2)
 * @returns next state, reward (pour l'IA), done
 */
export function step(s: State, aAI: Action, aPL: Action): { s2: State; r: number; done: boolean } {
  // Copie
  let { pHP, pCharge, eHP, eCharge, turn } = s;

  // Charges appliquées (pré-résolution)
  let nextPCharge = pCharge;
  let nextECharge = eCharge;

  // Dégâts simultanés
  const dmgToEnemy =
    aAI === Action.ATTACK ? resolveDamage(pCharge, aPL) : 0;
  const dmgToAI =
    aPL === Action.ATTACK ? resolveDamage(eCharge, aAI) : 0;

  // Consommation de charge si ATTACK avec charge>0
  if (aAI === Action.ATTACK && pCharge > 0) nextPCharge -= 1;
  if (aPL === Action.ATTACK && eCharge > 0) nextECharge -= 1;

  // Gain de charge si CHARGE
  if (aAI === Action.CHARGE) nextPCharge = clamp(nextPCharge + 1, 0, MAX_CHARGE);
  if (aPL === Action.CHARGE) nextECharge = clamp(nextECharge + 1, 0, MAX_CHARGE);

  // Appliquer dégâts
  const nextEHP = clamp(eHP - dmgToEnemy, 0, MAX_HP);
  const nextPHP = clamp(pHP - dmgToAI, 0, MAX_HP);

  const nextTurn = turn + 1;

  const s2: State = {
    pHP: nextPHP,
    pCharge: nextPCharge,
    eHP: nextEHP,
    eCharge: nextECharge,
    turn: nextTurn,
  };

  // Terminaison
  let done = false;
  let r = 0;
  if (nextPHP <= 0 && nextEHP <= 0) {
    done = true;
    r = 0; // draw
  } else if (nextEHP <= 0) {
    done = true;
    r = +1;
  } else if (nextPHP <= 0) {
    done = true;
    r = -1;
  } else if (nextTurn >= MAX_TURNS) {
    done = true;
    // tie-break (optionnel) : qui a le plus de HP ?
    if (nextPHP > nextEHP) r = +1;
    else if (nextPHP < nextEHP) r = -1;
    else r = 0;
  }

  return { s2, r, done };
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
