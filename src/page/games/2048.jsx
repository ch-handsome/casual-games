import { useState, useEffect, useCallback, useRef } from 'react'

const GRID_SIZE = 4
const STORAGE_KEY = '2048-best-score'

const TILE_COLORS = {
  2: { bg: '#eee4da', color: '#776e65' },
  4: { bg: '#ede0c8', color: '#776e65' },
  8: { bg: '#f2b179', color: '#f9f6f2' },
  16: { bg: '#f59563', color: '#f9f6f2' },
  32: { bg: '#f67c5f', color: '#f9f6f2' },
  64: { bg: '#f65e3b', color: '#f9f6f2' },
  128: { bg: '#edcf72', color: '#f9f6f2' },
  256: { bg: '#edcc61', color: '#f9f6f2' },
  512: { bg: '#edc850', color: '#f9f6f2' },
  1024: { bg: '#edc53f', color: '#f9f6f2' },
  2048: { bg: '#edc22e', color: '#f9f6f2' },
}

function getTileStyle(value) {
  if (value <= 2048) {
    return TILE_COLORS[value] || { bg: '#3c3a32', color: '#f9f6f2' }
  }
  return { bg: '#3c3a32', color: '#f9f6f2' }
}

function getFontSize(value) {
  const digits = value.toString().length
  if (digits === 1) return '48px'
  if (digits === 2) return '40px'
  if (digits === 3) return '32px'
  return '24px'
}

const addRandomTile = (newGrid) => {
  const emptyCells = []
  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      if (newGrid[i][j] === 0) {
        emptyCells.push({ row: i, col: j })
      }
    }
  }

  if (emptyCells.length === 0) return false

  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
  const value = Math.random() < 0.9 ? 2 : 4
  newGrid[randomCell.row][randomCell.col] = value
  return { position: randomCell, value }
}

export default function Game2048() {
  const [grid, setGrid] = useState(() => {
    const initialGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0))
    addRandomTile(initialGrid)
    addRandomTile(initialGrid)
    return initialGrid
  })
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [hasWon, setHasWon] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isWin, setIsWin] = useState(false)
  const [newTilePosition, setNewTilePosition] = useState(null)
  const [mergedTiles, setMergedTiles] = useState([])

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  const initGame = useCallback(() => {
    setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(0)))
    setScore(0)
    setHasWon(false)
    setGameOver(false)
    setShowModal(false)
    setNewTilePosition(null)
    setMergedTiles([])

    const savedBest = localStorage.getItem(STORAGE_KEY)
    setBestScore(savedBest ? parseInt(savedBest) : 0)

    // Add initial tiles
    setTimeout(() => {
      setGrid((g) => {
        const newGrid = g.map(row => [...row])
        addRandomTile(newGrid)
        addRandomTile(newGrid)
        return newGrid
      })
    }, 0)
  }, [])

  useEffect(() => {
    const savedBest = localStorage.getItem(STORAGE_KEY)
    setBestScore(savedBest ? parseInt(savedBest) : 0)
  }, [])

  const isGameOver = (currentGrid) => {
    // Check for empty cells
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        if (currentGrid[i][j] === 0) return false
      }
    }

    // Check for possible merges
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const current = currentGrid[i][j]
        if (j < GRID_SIZE - 1 && currentGrid[i][j + 1] === current) return false
        if (i < GRID_SIZE - 1 && currentGrid[i + 1][j] === current) return false
      }
    }

    return true
  }

  const slide = useCallback((direction) => {
    if (gameOver) return

    setGrid((currentGrid) => {
      const newGrid = currentGrid.map(row => [...row])
      let moved = false
      let mergedPositions = []
      let newScore = 0
      let won = hasWon

      if (direction === 'left' || direction === 'right') {
        for (let i = 0; i < GRID_SIZE; i++) {
          let row = newGrid[i].filter(val => val !== 0)
          if (direction === 'right') row.reverse()

          for (let j = 0; j < row.length - 1; j++) {
            if (row[j] === row[j + 1]) {
              row[j] *= 2
              newScore += row[j]
              row[j + 1] = 0
              mergedPositions.push({ row: i, col: direction === 'left' ? j : GRID_SIZE - 1 - j, value: row[j] })

              if (row[j] === 2048 && !won) {
                won = true
              }
            }
          }

          row = row.filter(val => val !== 0)
          while (row.length < GRID_SIZE) row.push(0)
          if (direction === 'right') row.reverse()

          for (let j = 0; j < GRID_SIZE; j++) {
            if (newGrid[i][j] !== row[j]) {
              moved = true
            }
            newGrid[i][j] = row[j]
          }
        }
      } else {
        for (let j = 0; j < GRID_SIZE; j++) {
          let col = []
          for (let i = 0; i < GRID_SIZE; i++) {
            col.push(newGrid[i][j])
          }
          col = col.filter(val => val !== 0)
          if (direction === 'down') col.reverse()

          for (let i = 0; i < col.length - 1; i++) {
            if (col[i] === col[i + 1]) {
              col[i] *= 2
              newScore += col[i]
              col[i + 1] = 0
              mergedPositions.push({
                row: direction === 'up' ? i : GRID_SIZE - 1 - i,
                col: j,
                value: col[i]
              })

              if (col[i] === 2048 && !won) {
                won = true
              }
            }
          }

          col = col.filter(val => val !== 0)
          while (col.length < GRID_SIZE) col.push(0)
          if (direction === 'down') col.reverse()

          for (let i = 0; i < GRID_SIZE; i++) {
            if (newGrid[i][j] !== col[i]) {
              moved = true
            }
            newGrid[i][j] = col[i]
          }
        }
      }

      if (moved) {
        setScore((prev) => {
          const totalScore = prev + newScore
          if (totalScore > bestScore) {
            setBestScore(totalScore)
            localStorage.setItem(STORAGE_KEY, totalScore)
          }
          return totalScore
        })

        addRandomTile(newGrid)

        setMergedTiles(mergedPositions)
        setTimeout(() => setMergedTiles([]), 100)

        if (won && !hasWon) {
          setHasWon(true)
          setIsWin(true)
          setShowModal(true)
          setGameOver(true)
        } else if (isGameOver(newGrid)) {
          setGameOver(true)
          setIsWin(false)
          setShowModal(true)
        }
      }

      return newGrid
    })
  }, [gameOver, hasWon, bestScore])

  useEffect(() => {
    const handleKeyDown = (e) => {
      let direction = null

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = 'up'
          break
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = 'down'
          break
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = 'left'
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = 'right'
          break
      }

      if (direction) {
        e.preventDefault()
        slide(direction)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [slide])

  useEffect(() => {
    const board = document.getElementById('game-board')
    if (!board) return

    const handleTouchStart = (e) => {
      touchStartX.current = e.touches[0].clientX
      touchStartY.current = e.touches[0].clientY
    }

    const handleTouchMove = (e) => {
      e.preventDefault()
    }

    const handleTouchEnd = (e) => {
      if (gameOver) return

      const touchEndX = e.changedTouches[0].clientX
      const touchEndY = e.changedTouches[0].clientY

      const deltaX = touchEndX - touchStartX.current
      const deltaY = touchEndY - touchStartY.current

      const absDeltaX = Math.abs(deltaX)
      const absDeltaY = Math.abs(deltaY)

      if (Math.max(absDeltaX, absDeltaY) < 50) return

      if (absDeltaX > absDeltaY) {
        slide(deltaX > 0 ? 'right' : 'left')
      } else {
        slide(deltaY > 0 ? 'down' : 'up')
      }
    }

    board.addEventListener('touchstart', handleTouchStart, { passive: true })
    board.addEventListener('touchmove', handleTouchMove, { passive: false })
    board.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      board.removeEventListener('touchstart', handleTouchStart)
      board.removeEventListener('touchmove', handleTouchMove)
      board.removeEventListener('touchend', handleTouchEnd)
    }
  }, [slide, gameOver])

  const handleNewGame = () => {
    initGame()
  }

  const handleRetry = () => {
    setShowModal(false)
    initGame()
  }

  const handleContinue = () => {
    setShowModal(false)
    setHasWon(false)
  }

  return (
    <div className="h-full flex items-center justify-center p-5 w-full max-w-[500px]">
      <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl p-5 flex flex-col gap-5 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-5xl font-bold text-white text-shadow-[2px_2px_4px_rgba(0,0,0,0.3)]">2048</h1>
            <div className="flex gap-2">
              <div className="bg-[rgba(238,228,218,0.35)] rounded-md px-4 py-2 text-center min-w-[80px]">
                <div className="text-[#eee4da] text-xs uppercase tracking-wider">分数</div>
                <div className="text-white text-xl font-bold">{score}</div>
              </div>
              <div className="bg-[rgba(238,228,218,0.35)] rounded-md px-4 py-2 text-center min-w-[80px]">
                <div className="text-[#eee4da] text-xs uppercase tracking-wider">最高</div>
                <div className="text-white text-xl font-bold">{bestScore}</div>
              </div>
            </div>
          </div>
          <button
            onClick={handleNewGame}
            className="px-6 py-3 bg-[#8f7a66] text-[#f9f6f2] rounded-md text-base font-bold cursor-pointer transition-colors duration-200 hover:bg-[#7f6a56] active:scale-95"
          >
            新游戏
          </button>
        </div>

        <div
          id="game-board"
          className="grid grid-cols-4 grid-rows-4 gap-[15px] bg-[rgba(238,228,218,0.35)] rounded-xl p-[15px] aspect-square touch-none"
        >
          {grid.map((row, rowIndex) =>
            row.map((value, colIndex) => {
              const isNew = newTilePosition?.row === rowIndex && newTilePosition?.col === colIndex
              const isMerged = mergedTiles.some(t => t.row === rowIndex && t.col === colIndex)
              const style = getTileStyle(value)

              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="bg-[rgba(238,228,218,0.35)] rounded-xl flex items-center justify-center font-bold relative transition-transform duration-100"
                  style={{ aspectRatio: '1' }}
                >
                  {value !== 0 && (
                    <div
                      className={`
                        absolute inset-0 flex items-center justify-center rounded-xl
                        ${isNew ? 'animate-[tileAppear_0.15s_ease-out]' : ''}
                        ${isMerged ? 'animate-[tileMerge_0.1s_ease-in-out]' : ''}
                      `}
                      style={{
                        backgroundColor: style.bg,
                        color: style.color,
                        fontSize: getFontSize(value),
                      }}
                    >
                      {value}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="text-[#666] text-sm text-center">
          <span className="text-[#00ffff]">WASD</span> 或 <span className="text-[#00ffff]">方向键</span> 控制移动
        </div>
      </div>

      {/* Modal */}
      <div
        className={`
          fixed inset-0 bg-black/70 flex items-center justify-center z-[100] transition-opacity duration-300
          ${showModal ? 'opacity-100 visible' : 'opacity-0 invisible'}
        `}
      >
        <div className="bg-[#faf8ef] rounded-2xl p-10 text-center max-w-[400px] w-[90%] transition-transform duration-300">
          <h2 className={`text-5xl font-bold mb-5 ${isWin ? 'text-[#edc22e]' : 'text-[#776e65]'}`}>
            {isWin ? '恭喜!' : '游戏结束'}
          </h2>
          <p className="text-lg text-[#776e65] mb-8">
            {isWin ? `你达到了 2048！当前得分: ${score}` : `最终得分: ${score}`}
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={handleRetry}
              className="px-7 py-4 text-base font-bold bg-[#8f7a66] text-[#f9f6f2] rounded-md cursor-pointer transition-colors duration-200 hover:bg-[#7f6a56] active:scale-95"
            >
              再试一次
            </button>
            {isWin && (
              <button
                onClick={handleContinue}
                className="px-7 py-4 text-base font-bold bg-[#c2b280] text-[#f9f6f2] rounded-md cursor-pointer transition-colors duration-200 hover:bg-[#b2a270] active:scale-95"
              >
                继续游戏
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}