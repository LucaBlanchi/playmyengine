import { Chess } from "chess.js"

export function chooseMove(fen) {
  const game = new Chess(fen)
  const moves = game.moves({ verbose: true })

  if (moves.length === 0) {
    return null
  }

  const move = moves[Math.floor(Math.random() * moves.length)]

  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion
  }
}