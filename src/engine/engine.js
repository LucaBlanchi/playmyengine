import { Chess } from "chess.js"

export function createEngine({
  startingFen,
  color,
  strategy
}) {
  const game = new Chess(startingFen)

  function playMove() {
    if (game.isGameOver()) {
      return null
    }

    if (game.turn() !== color) {
      return null
    }

    const move = strategy.chooseMove(game)

    if (!move) {
      return null
    }

    game.move(move)

    return move
  }

  function start() {
    return playMove()
  }

  function respondToMove(opponentMove) {
    if (game.isGameOver()) {
      return null
    }

    if (game.turn() === color) {
      throw new Error("Expected opponent move")
    }

    game.move(opponentMove)

    return playMove()
  }

  return {
    start,
    respondToMove
  }
}