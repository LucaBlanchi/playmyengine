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

function isOpeningComplete(game, color) {
  const history = game.history({ verbose: true })

  const kingMoved = history.some(
    (move) =>
      move.color === color &&
      move.piece === "k"
  )

  const knightSquares =
    color === "w"
      ? ["b1", "g1"]
      : ["b8", "g8"]

  const bishopSquares =
    color === "w"
      ? ["c1", "f1"]
      : ["c8", "f8"]

  const knightsDeveloped = knightSquares.every((square) => {
    const piece = game.get(square)

    return !(
      piece &&
      piece.color === color &&
      piece.type === "n"
    )
  })

  const bishopsDeveloped = bishopSquares.every((square) => {
    const piece = game.get(square)

    return !(
      piece &&
      piece.color === color &&
      piece.type === "b"
    )
  })

  return (
    kingMoved &&
    knightsDeveloped &&
    bishopsDeveloped
  )
}

function filterPreferredOpeningMoves(moves, color) {
  const preferredMoves =
    color === "w"
      ? [
          ["e2", "e4"],
          ["d2", "d3"],
          ["d2", "d4"],
          ["g1", "f3"],
          ["b1", "c3"],
          ["c1", "d2"],
          ["c1", "e3"],
          ["c1", "f4"],
          ["c1", "g5"],
          ["f1", "e2"],
          ["f1", "d3"],
          ["f1", "c4"],
          ["f1", "b5"],
          ["e1", "g1"]
        ]
      : [
          ["e7", "e5"],
          ["d7", "d6"],
          ["d7", "d5"],
          ["g8", "f6"],
          ["b8", "c6"],
          ["c8", "d7"],
          ["c8", "e6"],
          ["c8", "f5"],
          ["c8", "g4"],
          ["f8", "e7"],
          ["f8", "d6"],
          ["f8", "c5"],
          ["f8", "b4"],
          ["e8", "g8"]
        ]

  return moves.filter((move) =>
    preferredMoves.some(
      ([from, to]) =>
        move.from === from &&
        move.to === to
    )
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

export function createEngineStrategy({ color }) {
  const state = {
    opening: true
  }

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

    // Keep moves with the best worst-case material outcome
    // TODO: this is clanky and artificial
    moves = filterBestMaterialMoves(game, moves)

    // Develop pieces in the opening
    if (state.opening && isOpeningComplete(game, color)) {
      state.opening = false
    }
    if (state.opening) {
      const preferredMoves = filterPreferredOpeningMoves(moves, color)

      if (preferredMoves.length > 0) {
        moves = preferredMoves
      }
    }

    // Just play a move
    return findRandomMove(moves)
  }

  return {
    chooseMove
  }
}
