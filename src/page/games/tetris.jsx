import { useState, useEffect, useCallback, useRef } from 'react'

const COLS = 10
const ROWS = 20
const STORAGE_KEY = 'tetris-best-score'

const SHAPES = {
  I: { shape: [[1, 1, 1, 1]], color: '#00e5f0' },
  O: { shape: [[1, 1], [1, 1]], color: '#ffe066' },
  T: { shape: [[0, 1, 0], [1, 1, 1]], color: '#d06ef0' },
  L: { shape: [[1, 0, 0], [1, 1, 1]], color: '#f0a04e' },
  J: { shape: [[0, 0, 1], [1, 1, 1]], color: '#4e9ef0' },
  S: { shape: [[0, 1, 1], [1, 1, 0]], color: '#50c878' },
  Z: { shape: [[1, 1, 0], [0, 1, 1]], color: '#e85d75' },
}

const SHAPE_KEYS = Object.keys(SHAPES)

const createEmptyBoard = () =>
  Array(ROWS).fill(null).map(() => Array(COLS).fill(0))

const getRandomShape = () => {
  const key = SHAPE_KEYS[Math.floor(Math.random() * SHAPE_KEYS.length)]
  return { key, ...SHAPES[key] }
}

const rotateShape = (shape) => {
  const rows = shape.length
  const cols = shape[0].length
  const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      rotated[x][rows - 1 - y] = shape[y][x]
    }
  }
  return rotated
}

const collide = (board, shape, posX, posY) => {
  for (let y = 0; y < shape.length; y++) {
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] !== 0) {
        const boardX = posX + x
        const boardY = posY + y
        if (boardX < 0 || boardX >= COLS || boardY >= ROWS) {
          return true
        }
        if (boardY >= 0 && board[boardY][boardX] !== 0) {
          return true
        }
      }
    }
  }
  return false
}

const clearRows = (board) => {
  let rowsCleared = 0
  const newBoard = board.filter(row => row.some(cell => cell === 0))
  rowsCleared = ROWS - newBoard.length
  while (newBoard.length < ROWS) {
    newBoard.unshift(Array(COLS).fill(0))
  }
  return { board: newBoard, rowsCleared }
}

const getGhostPosition = (board, shape, posX, posY) => {
  let ghostY = posY
  while (!collide(board, shape, posX, ghostY + 1)) {
    ghostY++
  }
  return ghostY
}

export default function Tetris() {
  const [board, setBoard] = useState(createEmptyBoard)
  const [currentPiece, setCurrentPiece] = useState(null)
  const [nextPiece, setNextPiece] = useState(null)
  const [posX, setPosX] = useState(0)
  const [posY, setPosY] = useState(0)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [level, setLevel] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [linesCleared, setLinesCleared] = useState(0)

  const gameLoopRef = useRef(null)
  const lastDropTime = useRef(0)
  const isMobile = useRef(false)

  useEffect(() => {
    isMobile.current = window.innerWidth < 600
    const handleResize = () => {
      isMobile.current = window.innerWidth < 600
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const getSpeed = useCallback((lvl) => {
    const speeds = [500, 450, 400, 350, 300, 250, 200, 150, 100, 80]
    return speeds[Math.min(lvl, speeds.length - 1)]
  }, [])

  const spawnPiece = useCallback(() => {
    const piece = nextPiece || getRandomShape()
    const next = getRandomShape()
    setNextPiece(next)

    const newPosX = Math.floor((COLS - piece.shape[0].length) / 2)
    const newPosY = 0

    if (collide(board, piece.shape, newPosX, newPosY)) {
      setIsGameOver(true)
      return false
    }

    setCurrentPiece(piece)
    setPosX(newPosX)
    setPosY(newPosY)
    return true
  }, [board, nextPiece])

  const lockPiece = useCallback(() => {
    const newBoard = board.map(row => [...row])
    const { shape, color } = currentPiece

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const boardY = posY + y
          const boardX = posX + x
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newBoard[boardY][boardX] = color
          }
        }
      }
    }

    const { board: clearedBoard, rowsCleared } = clearRows(newBoard)
    setBoard(clearedBoard)

    if (rowsCleared > 0) {
      setLinesCleared(prev => prev + rowsCleared)
      const points = { 1: 100, 2: 300, 3: 500, 4: 800 }
      const newScore = score + (points[rowsCleared] || rowsCleared * 100)
      setScore(newScore)

      const newLevel = Math.floor(newScore / 500)
      setLevel(newLevel)

      if (newScore > bestScore) {
        setBestScore(newScore)
        localStorage.setItem(STORAGE_KEY, newScore)
      }
    }

    spawnPiece()
  }, [board, currentPiece, posX, posY, score, bestScore, spawnPiece])

  const movePiece = useCallback((dx, dy) => {
    if (!currentPiece || isPaused || isGameOver) return

    const newX = posX + dx
    const newY = posY + dy

    if (!collide(board, currentPiece.shape, newX, newY)) {
      setPosX(newX)
      setPosY(newY)
      return true
    }

    if (dy > 0) {
      lockPiece()
      return false
    }
    return false
  }, [currentPiece, posX, posY, board, isPaused, isGameOver, lockPiece])

  const rotatePiece = useCallback(() => {
    if (!currentPiece || isPaused || isGameOver) return

    const rotated = rotateShape(currentPiece.shape)
    if (!collide(board, rotated, posX, posY)) {
      setCurrentPiece({ ...currentPiece, shape: rotated })
    } else if (!collide(board, rotated, posX - 1, posY)) {
      setCurrentPiece({ ...currentPiece, shape: rotated })
      setPosX(posX - 1)
    } else if (!collide(board, rotated, posX + 1, posY)) {
      setCurrentPiece({ ...currentPiece, shape: rotated })
      setPosX(posX + 1)
    }
  }, [currentPiece, posX, posY, board, isPaused, isGameOver])

  const hardDrop = useCallback(() => {
    if (!currentPiece || isPaused || isGameOver) {
      return
    }

    let dropY = posY
    while (!collide(board, currentPiece.shape, posX, dropY + 1)) {
      dropY++
    }

    if (dropY === posY) {
      lockPiece()
      return
    }

    // 直接在 lockPiece 中使用 dropY，而不是先 setPosY
    const newBoard = board.map(row => [...row])
    const { shape, color } = currentPiece

    for (let y = 0; y < shape.length; y++) {
      for (let x = 0; x < shape[y].length; x++) {
        if (shape[y][x] !== 0) {
          const boardY = dropY + y
          const boardX = posX + x
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            newBoard[boardY][boardX] = color
          }
        }
      }
    }

    const { board: clearedBoard, rowsCleared } = clearRows(newBoard)
    setBoard(clearedBoard)

    if (rowsCleared > 0) {
      setLinesCleared(prev => prev + rowsCleared)
      const points = { 1: 100, 2: 300, 3: 500, 4: 800 }
      const newScore = score + (points[rowsCleared] || rowsCleared * 100)
      setScore(newScore)

      const newLevel = Math.floor(newScore / 500)
      setLevel(newLevel)

      if (newScore > bestScore) {
        setBestScore(newScore)
        localStorage.setItem(STORAGE_KEY, newScore)
      }
    }

    spawnPiece()
  }, [currentPiece, posX, posY, board, isPaused, isGameOver, score, bestScore, spawnPiece])

  const startGame = useCallback(() => {
    const firstPiece = getRandomShape()
    const secondPiece = getRandomShape()
    setBoard(createEmptyBoard())
    setScore(0)
    setLevel(0)
    setLinesCleared(0)
    setIsPaused(false)
    setIsGameOver(false)
    setCurrentPiece(firstPiece)
    setNextPiece(secondPiece)
    setPosX(Math.floor((COLS - firstPiece.shape[0].length) / 2))
    setPosY(0)
    lastDropTime.current = 0

    const savedBest = localStorage.getItem(STORAGE_KEY)
    setBestScore(savedBest ? parseInt(savedBest) : 0)
  }, [])

  useEffect(() => {
    startGame()
  }, [])

  useEffect(() => {
    if (isGameOver || isPaused) return

    const gameLoop = (timestamp) => {
      if (!lastDropTime.current) lastDropTime.current = timestamp

      const dropInterval = getSpeed(level)
      const elapsed = timestamp - lastDropTime.current

      if (elapsed >= dropInterval) {
        movePiece(0, 1)
        lastDropTime.current = timestamp
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [isGameOver, isPaused, level, movePiece, getSpeed])

  useEffect(() => {
    if (!currentPiece && !isGameOver && !isPaused) {
      spawnPiece()
    }
  }, [currentPiece, isGameOver, isPaused, spawnPiece])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isGameOver) {
        if (e.key === 'r' || e.key === 'R' || e.key === ' ') {
          e.preventDefault()
          startGame()
        }
        return
      }

      if (isPaused) {
        if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
          e.preventDefault()
          setIsPaused(false)
        }
        return
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault()
          movePiece(-1, 0)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault()
          movePiece(1, 0)
          break
        case 'ArrowUp':
        case 'w':
        case 'W':
        case 'k':
        case 'K':
          e.preventDefault()
          rotatePiece()
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault()
          movePiece(0, 1)
          break
        case ' ':
          e.preventDefault()
          hardDrop()
          break
        case 'p':
        case 'P':
        case 'Escape':
          e.preventDefault()
          setIsPaused(true)
          break
        case 'r':
        case 'R':
          e.preventDefault()
          startGame()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isGameOver, isPaused, movePiece, rotatePiece, hardDrop, startGame])

  const renderCell = (color, isGhost = false) => {
    if (color === 0) return null

    return (
      <div
        className="absolute inset-0 rounded-sm"
        style={{
          backgroundColor: isGhost ? `${color}40` : color,
          boxShadow: isGhost
            ? 'none'
            : `inset 0 0 10px ${color}80, 0 0 8px ${color}60`,
          border: isGhost ? `2px dashed ${color}60` : `2px solid ${color}30`,
        }}
      />
    )
  }

  const renderPreview = (shape, color) => {
    if (!shape) return null

    const rows = shape.length
    const cols = shape[0].length
    const gridSize = 4

    const offsetX = Math.floor((gridSize - cols) / 2)
    const offsetY = Math.floor((gridSize - rows) / 2)

    const grid = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0))
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        grid[y + offsetY][x + offsetX] = shape[y][x]
      }
    }

    return (
      <div
        className="grid gap-1 w-full h-full"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gridTemplateRows: `repeat(${gridSize}, 1fr)`,
        }}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => (
            <div
              key={`${y}-${x}`}
              className="w-full h-full relative rounded-sm border border-white/10"
              style={{ backgroundColor: cell !== 0 ? color : 'rgba(0,0,0,0.3)' }}
            >
              {cell !== 0 && (
                <div
                  className="absolute inset-0 rounded-sm"
                  style={{
                    boxShadow: `inset 0 0 8px ${color}80, 0 0 6px ${color}50`,
                    border: `1px solid ${color}30`,
                  }}
                />
              )}
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex items-center justify-center w-full overflow-hidden">
      <div className="flex flex-col items-center gap-3 overflow-hidden bg-black/40 p-5 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)">
        {/* Game Area */}
        <div className="flex gap-5 items-start">
          {/* Main Board */}
          <div className="relative  border border-white/10 p-2 rounded-lg backdrop-blur-md bg-black/40">
            <div
              className="grid gap-[1px] bg-white/5"
              style={{
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                width: isMobile.current ? '260px' : '300px',
                height: isMobile.current ? '520px' : '600px',
              }}
            >
              {board.map((row, y) =>
                row.map((cell, x) => {
                  let isCurrentPiece = false
                  let isGhost = false

                  if (currentPiece && !isGameOver) {
                    const ghostY = getGhostPosition(board, currentPiece.shape, posX, posY)
                    isGhost = y >= ghostY && y < ghostY + currentPiece.shape.length &&
                      x >= posX && x < posX + currentPiece.shape[0].length &&
                      currentPiece.shape[y - ghostY] && currentPiece.shape[y - ghostY][x - posX] !== 0

                    isCurrentPiece = y >= posY && y < posY + currentPiece.shape.length &&
                      x >= posX && x < posX + currentPiece.shape[0].length &&
                      currentPiece.shape[y - posY] && currentPiece.shape[y - posY][x - posX] !== 0
                  }

                  return (
                    <div
                      key={`${y}-${x}`}
                      className="relative bg-black/30 rounded-sm"
                      style={{ aspectRatio: '1' }}
                    >
                      {renderCell(cell)}
                      {isCurrentPiece && !isGhost && currentPiece && renderCell(currentPiece.color)}
                      {isGhost && currentPiece && renderCell(currentPiece.color, true)}
                    </div>
                  )
                })
              )}
            </div>

            {/* Overlay */}
            {isGameOver && (
              <div className="absolute inset-0 bg-black/80 rounded-xl flex flex-col items-center justify-center z-10">
                <h2 className="text-4xl font-bold text-red-500 mb-4">游戏结束</h2>
                <p className="text-white text-xl mb-2">最终得分: {score}</p>
                <p className="text-white/60 mb-6">消除行数: {linesCleared}</p>
                <button
                  onClick={startGame}
                  className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
                >
                  再玩一次
                </button>
                <p className="text-white/40 text-sm mt-4">按 R 键重新开始</p>
              </div>
            )}

            {isPaused && !isGameOver && (
              <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center z-10">
                <h2 className="text-4xl font-bold text-white">暂停</h2>
              </div>
            )}
          </div>

          {/* Side Panel */}
          <div className="flex flex-col gap-3 w-24">
            {/* Score Info */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-2 border border-white/10">
              <div className="flex flex-col gap-2">
                <div className="bg-white/10 rounded-lg px-2 py-1 text-center">
                  <div className="text-white/60 text-xs">分数</div>
                  <div className="text-white text-base font-bold">{score}</div>
                </div>
                <div className="bg-white/10 rounded-lg px-2 py-1 text-center">
                  <div className="text-white/60 text-xs">最高</div>
                  <div className="text-white text-base font-bold">{bestScore}</div>
                </div>
                <div className="bg-white/10 rounded-lg px-2 py-1 text-center">
                  <div className="text-white/60 text-xs">等级</div>
                  <div className="text-white text-base font-bold">{level}</div>
                </div>
              </div>
            </div>

            {/* Next Piece */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-2 border border-white/10">
              <div className="text-white/70 text-xs mb-1 text-center">下一个</div>
              <div className="aspect-square w-full">
                {nextPiece && renderPreview(nextPiece.shape, nextPiece.color)}
              </div>
            </div>

            {/* Controls */}
            <button
              onClick={startGame}
              className="px-3 py-2 bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] text-white rounded-lg font-bold text-xs cursor-pointer transition-all duration-100 border-t border-[#60a5fa] shadow-[0_4px_0_#1e40af,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#1e40af,0_6px_15px_rgba(0,0,0,0.4)] active:shadow-[0_2px_0_#1e40af,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1"
            >
              新游戏
            </button>
            <button
              onClick={() => setIsPaused(p => !p)}
              disabled={isGameOver}
              className="px-3 py-2 bg-gradient-to-b from-[#f59e0b] to-[#d97706] text-white rounded-lg font-bold text-xs cursor-pointer transition-all duration-100 border-t border-[#fbbf24] shadow-[0_4px_0_#b45309,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#b45309,0_6px_15px_rgba(0,0,0,0.4)] active:shadow-[0_2px_0_#b45309,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isPaused ? '继续' : '暂停'}
            </button>
          </div>
        </div>

        {/* Touch Controls */}
        <div className="flex gap-2 justify-center flex-wrap md:hidden">
          <button
            onTouchStart={(e) => { e.preventDefault(); movePiece(-1, 0) }}
            className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white text-xl font-bold active:bg-white/30"
          >
            ◀
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); movePiece(1, 0) }}
            className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white text-xl font-bold active:bg-white/30"
          >
            ▶
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); rotatePiece() }}
            className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white text-xl font-bold active:bg-white/30"
          >
            ↻
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); movePiece(0, 1) }}
            className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 text-white text-xl font-bold active:bg-white/30"
          >
            ▼
          </button>
          <button
            onTouchStart={(e) => { e.preventDefault(); hardDrop() }}
            className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl border border-white/20 text-white text-lg font-bold active:opacity-80"
          >
            ⬇⬇
          </button>
        </div>

        {/* Desktop Controls Hint */}
         <div className="text-[#666] text-sm text-center">
          <span className="text-[#00ffff]">左右</span> 控制移动 | 
          <span className="text-[#00ffff]"> 上</span> 旋转 |
          <span className="text-[#00ffff]"> 下</span> 速降 |
          <span className="text-[#00ffff]"> 空格</span> 硬到底 |
          <span className="text-[#00ffff]"> P</span> 暂停 |
          <span className="text-[#00ffff]"> R</span> 重开
        </div>
      </div>

      <style>{`
        .text-shadow {
          text-shadow: 0 0 10px rgba(138, 43, 226, 0.8), 0 0 20px rgba(138, 43, 226, 0.5);
        }
        .touch-none {
          touch-action: none;
        }
      `}</style>
    </div>
  )
}