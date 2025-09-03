export enum Action {
  ATTACK = 0,
  DEFEND = 1,
  CHARGE = 2,
}

export type QRow = [number, number, number]; // [qA, qD, qC]

export interface State {
  pHP: number;     // HP de l'IA (player IA)
  pCharge: number; // charge de l'IA
  eHP: number;     // HP de l'adversaire (joueur humain)
  eCharge: number; // charge de l'adversaire
  turn: number;    // compteur de tours
}
