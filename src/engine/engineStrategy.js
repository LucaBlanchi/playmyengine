function toMove(move) {
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion
  }
}

function findForcedMove(moves) {
  if (moves.length !== 1) {
    return null
  }

  return toMove(moves[0])
}

function findMateInOne(game, moves) {
  for (const move of moves) {
    game.move(move)
    const isMate = game.isCheckmate()
    game.undo()

    if (isMate) {
      return toMove(move)
    }
  }

  return null
}

function findBestHangingCapture(game, moves) {
  const capturePriority = ["q", "r", "b", "n", "p"]

  const opponentColor = game.turn() === "w" ? "b" : "w"

  const hangingCaptures = moves.filter((move) => {
    if (!move.captured) {
      return false
    }

    return game.attackers(move.to, opponentColor).length === 0
  })

  if (hangingCaptures.length === 0) {
    return null
  }

  const bestCapturedPiece = capturePriority.find((piece) =>
    hangingCaptures.some((move) => move.captured === piece)
  )

  const bestCaptures = hangingCaptures.filter(
    (move) => move.captured === bestCapturedPiece
  )

  return toMove(
    bestCaptures[
      Math.floor(Math.random() * bestCaptures.length)
    ]
  )
}

function findRandomMove(moves) {
  if (moves.length === 0) {
    return null
  }

  const move =
    moves[Math.floor(Math.random() * moves.length)]

  return toMove(move)
}

export function createEngineStrategy() {
  const state = {}

  function chooseMove(game) {
    const moves = game.moves({ verbose: true })

    // Play forced moves
    const forcedMove = findForcedMove(moves)
    if (forcedMove) return forcedMove

    // Play mate in 1
    const mateMove = findMateInOne(game, moves)
    if (mateMove) return mateMove

    // Capture hanging pieces
    const hangingCapture = findBestHangingCapture(game, moves)
    if (hangingCapture) return hangingCapture

    // Just play a move
    return findRandomMove(moves)
  }

  return {
    chooseMove
  }
}