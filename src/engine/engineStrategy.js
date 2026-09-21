function toMove(move) {
  return {
    from: move.from,
    to: move.to,
    promotion: move.promotion
  }
}

const pieceValue = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9
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

function filterMovesAvoidingMateInOne(game, moves) {
  return moves.filter((move) => {
    game.move(move)

    const opponentMoves = game.moves({ verbose: true })

    const allowsMateInOne = opponentMoves.some((opponentMove) => {
      game.move(opponentMove)

      const isMate = game.isCheckmate()

      game.undo()

      return isMate
    })

    game.undo()

    return !allowsMateInOne
  })
}

function getMaterialScore(game, color) {
  return game
    .board()
    .flat()
    .filter(Boolean)
    .reduce((score, piece) => {
      const value = pieceValue[piece.type] ?? 0

      return piece.color === color
        ? score + value
        : score - value
    }, 0)
}

function filterBestMaterialMoves(game, moves) {
  const color = game.turn()

  const evaluatedMoves = moves.map((move) => {
    game.move(move)

    const opponentMoves = game.moves({ verbose: true })

    let worstScore

    if (opponentMoves.length === 0) {
      worstScore = getMaterialScore(game, color)
    } else {
      worstScore = Infinity

      for (const opponentMove of opponentMoves) {
        game.move(opponentMove)

        const score = getMaterialScore(game, color)

        game.undo()

        worstScore = Math.min(worstScore, score)
      }
    }

    game.undo()

    return {
      move,
      score: worstScore
    }
  })

  const bestScore = Math.max(
    ...evaluatedMoves.map(({ score }) => score)
  )

  return evaluatedMoves
    .filter(({ score }) => score === bestScore)
    .map(({ move }) => move)
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
    let moves = game.moves({ verbose: true })

    // Play forced moves
    if (moves.length === 1) return toMove(moves[0])

    // Play mate in 1
    const mateMove = findMateInOne(game, moves)
    if (mateMove) return mateMove

    // Avoid hanging mate in 1
    const safeMoves = filterMovesAvoidingMateInOne(game, moves)
    if (safeMoves.length === 0) {
      return findRandomMove(moves)
    }
    moves = safeMoves

    // Consider moves that grant the most material next turn
    moves = filterBestMaterialMoves(game, moves)

    // Just play a move
    return findRandomMove(moves)
  }

  return {
    chooseMove
  }
}