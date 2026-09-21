import { Chess } from "chess.js"

export function createEngine({ startingFen, color }) {
  const game = new Chess(startingFen)

  function playMove() {
    if (game.isGameOver()) {
      return null
    }

    if (game.turn() !== color) {
      return null
    }

    const move = chooseMove()

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

  function chooseMove() {
    const moves = game.moves({ verbose: true })

    // Play forced moves
    if (moves.length === 1) {
      const move = moves[0]

      return {
        from: move.from,
        to: move.to,
        promotion: move.promotion
      }
    }

    // Play mate in 1
    for (const move of moves) {
      game.move(move)

      const isMate = game.isCheckmate()

      game.undo()

      if (isMate) {
        return {
          from: move.from,
          to: move.to,
          promotion: move.promotion
        }
      }
    }

    // Just play a random move
    const move = moves[Math.floor(Math.random() * moves.length)]

    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion
    }
  }

  return {
    start,
    respondToMove
  }
}