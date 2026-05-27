import { useState, useEffect, useRef, useCallback } from 'react'

// ==================== 可配置参数 ====================
const CONFIG = {
  GRID_SIZE: 10,        // 网格大小，可改为 8/10/12/15
  CELL_SIZE: 40,        // 格子大小(px)，会自动适配屏幕
  COLORS: 6,            // 颜色数量 4/5/6/8
  ANIMATION_SPEED: 200  // 动画速度(ms)
}

const STORAGE_KEY = 'eliminate-best-score'

// 方块颜色配置 - 渐变色
const BLOCK_COLORS = [
  { fill: ['#ff6b6b', '#ee5a5a'], stroke: '#ff4757' },   // 红色
  { fill: ['#55efc4', '#00b894'], stroke: '#00cec9' },   // 绿色
  { fill: ['#ffe66d', '#ffd93d'], stroke: '#ffa502' },   // 黄色
  { fill: ['#a29bfe', '#8c7ae6'], stroke: '#7c3aed' },   // 紫色
  { fill: ['#74b9ff', '#5dade2'], stroke: '#0984e3' },   // 蓝色
  { fill: ['#fd79a8', '#e84393'], stroke: '#d63384' },   // 粉色
]

// 初始化棋盘
function initBoard() {
  const board = []
  for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
    board[i] = []
    for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
      let color
      do {
        color = Math.floor(Math.random() * CONFIG.COLORS)
      } while (wouldCreateMatch(board, i, j, color))
      board[i][j] = color
    }
  }
  return board
}

// 检查是否会产生初始三消
function wouldCreateMatch(board, row, col, color) {
  if (col >= 2 &&
    board[row][col - 1] === color &&
    board[row][col - 2] === color) {
    return true
  }
  if (row >= 2 &&
    board[row - 1]?.[col] === color &&
    board[row - 2]?.[col] === color) {
    return true
  }
  return false
}

// 获取所有匹配格子
function getMatches(board) {
  const matched = new Set()

  // 检查水平匹配
  for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
    for (let j = 0; j < CONFIG.GRID_SIZE - 2; j++) {
      const color = board[i]?.[j]
      if (color === undefined || color === -1) continue
      let length = 1
      while (j + length < CONFIG.GRID_SIZE && board[i][j + length] === color) {
        length++
      }
      if (length >= 3) {
        for (let k = 0; k < length; k++) {
          matched.add(`${i},${j + k}`)
        }
        j += length - 1
      }
    }
  }

  // 检查垂直匹配
  for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
    for (let i = 0; i < CONFIG.GRID_SIZE - 2; i++) {
      const color = board[i]?.[j]
      if (color === undefined || color === -1) continue
      let length = 1
      while (i + length < CONFIG.GRID_SIZE && board[i + length]?.[j] === color) {
        length++
      }
      if (length >= 3) {
        for (let k = 0; k < length; k++) {
          matched.add(`${i + k},${j}`)
        }
        i += length - 1
      }
    }
  }

  return Array.from(matched).map(s => {
    const [row, col] = s.split(',').map(Number)
    return { row, col }
  })
}

// 计算消除得分
function calculateScore(matches, currentLevel) {
  const count = matches.length
  if (count >= 6) return 50 * currentLevel
  if (count >= 5) return 35 * currentLevel
  if (count >= 4) return 20 * currentLevel
  return 10 * currentLevel
}

// 重力下落
function applyGravity(board) {
  const newBoard = board.map(row => [...row])

  for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
    const column = []
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      if (newBoard[i]?.[j] !== -1 && newBoard[i]?.[j] !== undefined) {
        column.push(newBoard[i][j])
      }
    }
    while (column.length < CONFIG.GRID_SIZE) {
      column.unshift(Math.floor(Math.random() * CONFIG.COLORS))
    }
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      newBoard[i][j] = column[i]
    }
  }

  return newBoard
}

// 检测有效移动
function hasValidMove(board) {
  const directions = [
    { dr: -1, dc: 0 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: 0, dc: 1 },
  ]

  for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
    for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
      for (const { dr, dc } of directions) {
        const ni = i + dr
        const nj = j + dc
        if (ni >= 0 && ni < CONFIG.GRID_SIZE && nj >= 0 && nj < CONFIG.GRID_SIZE) {
          // 尝试交换
          const temp = board[i][j]
          board[i][j] = board[ni][nj]
          board[ni][nj] = temp

          const matches = getMatches(board)
          if (matches.length > 0) {
            board[ni][nj] = board[i][j]
            board[i][j] = temp
            return { valid: true, from: { row: i, col: j }, to: { row: ni, col: nj } }
          }

          board[ni][nj] = board[i][j]
          board[i][j] = temp
        }
      }
    }
  }

  return { valid: false }
}

// 洗牌
function shuffleBoard(board) {
  const newBoard = board.map(row => [...row])
  let attempts = 0

  while (attempts < 100) {
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
        const ni = Math.floor(Math.random() * CONFIG.GRID_SIZE)
        const nj = Math.floor(Math.random() * CONFIG.GRID_SIZE)
        const temp = newBoard[i][j]
        newBoard[i][j] = newBoard[ni][nj]
        newBoard[ni][nj] = temp
      }
    }

    const hasMove = hasValidMove(newBoard)
    if (hasMove.valid) {
      return { board: newBoard, hint: hasMove }
    }
    attempts++
  }

  return { board: initBoard(), hint: null }
}

// 绘制圆角矩形
function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

// 绘制方块
function drawBlock(ctx, colorIndex, x, y, size, isSelected, isHint, animProgress, isEliminating, swapOffset, dropOffset) {
  const color = BLOCK_COLORS[colorIndex]
  const padding = 3
  const radius = 8

  ctx.save()

  // 交换动画：平移
  if (swapOffset) {
    ctx.translate(swapOffset.x, swapOffset.y)
  }

  // 下落动画
  if (dropOffset) {
    ctx.translate(0, dropOffset * size)
  }

  // 消除动画：缩放+淡出
  if (isEliminating && animProgress !== undefined) {
    const scale = 1 - animProgress
    const alpha = 1 - animProgress
    const centerX = x + size / 2
    const centerY = y + size / 2
    ctx.translate(centerX, centerY)
    ctx.scale(scale, scale)
    ctx.translate(-centerX, -centerY)
    ctx.globalAlpha = alpha
  }

  // 选中效果
  if (isSelected) {
    ctx.shadowColor = '#ffd700'
    ctx.shadowBlur = 15
  }

  // 提示闪烁效果
  if (isHint && animProgress !== undefined) {
    const alpha = 0.5 + 0.5 * Math.sin(animProgress * Math.PI * 6)
    ctx.globalAlpha = alpha
    ctx.shadowColor = '#00ffff'
    ctx.shadowBlur = 20
  }

  // 绘制渐变填充
  const gradient = ctx.createLinearGradient(x, y, x + size, y + size)
  gradient.addColorStop(0, color.fill[0])
  gradient.addColorStop(1, color.fill[1])

  drawRoundedRect(ctx, x + padding, y + padding, size - padding * 2, size - padding * 2, radius)
  ctx.fillStyle = gradient
  ctx.fill()

  // 绘制边框
  ctx.strokeStyle = isSelected ? '#ffd700' : color.stroke
  ctx.lineWidth = isSelected ? 3 : 2
  ctx.stroke()

  // 高光效果
  ctx.globalAlpha = 0.3
  ctx.beginPath()
  ctx.arc(x + size * 0.3, y + size * 0.3, size * 0.15, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  ctx.restore()
}

export default function EliminateGame() {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [isAnimating, setIsAnimating] = useState(false)
  const [selectedCell, setSelectedCell] = useState(null)
  const [message, setMessage] = useState('')

  const boardRef = useRef(initBoard())
  const cellSizeRef = useRef(CONFIG.CELL_SIZE)
  const hintCellsRef = useRef(null)
  const animStateRef = useRef({ eliminating: [], dropY: [], hintProgress: 0, swapping: null })

  // 初始化
  useEffect(() => {
    const savedBest = localStorage.getItem(STORAGE_KEY)
    if (savedBest) {
      setBestScore(parseInt(savedBest))
    }
    // 检测初始是否有有效移动
    setTimeout(() => {
      const hasMove = hasValidMove(boardRef.current)
      if (!hasMove.valid) {
        const shuffled = shuffleBoard(boardRef.current)
        boardRef.current = shuffled.board
        render()
      }
    }, 100)
  }, [])

      // 响应式调整格子大小
  useEffect(() => {
    // 根据屏幕宽度计算合适的格子大小
    const screenWidth = window.innerWidth
    let cellSize = CONFIG.CELL_SIZE

    // 小屏幕自动缩小格子
    if (screenWidth < 480) {
      cellSize = Math.max(28, Math.floor(screenWidth / (CONFIG.GRID_SIZE + 2)))
    }

    if (!canvasRef.current) return
    cellSizeRef.current = cellSize
    canvasRef.current.width = CONFIG.GRID_SIZE * cellSize
    canvasRef.current.height = CONFIG.GRID_SIZE * cellSize

    const handleResize = () => {
      const sw = window.innerWidth
      let newSize = CONFIG.CELL_SIZE
      if (sw < 480) {
        newSize = Math.max(28, Math.floor(sw / (CONFIG.GRID_SIZE + 2)))
      }
      if (cellSizeRef.current !== newSize && canvasRef.current) {
        cellSizeRef.current = newSize
        canvasRef.current.width = CONFIG.GRID_SIZE * newSize
        canvasRef.current.height = CONFIG.GRID_SIZE * newSize
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 渲染画布
  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const cellSize = cellSizeRef.current
    const board = boardRef.current

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制背景网格
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)'
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
        drawRoundedRect(ctx, j * cellSize + 2, i * cellSize + 2, cellSize - 4, cellSize - 4, 6)
        ctx.fill()
      }
    }

    // 绘制方块
    for (let i = 0; i < CONFIG.GRID_SIZE; i++) {
      for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
        const colorIndex = board[i]?.[j]
        if (colorIndex === undefined || colorIndex === -1) continue

        const isSelected = selectedCell && selectedCell.row === i && selectedCell.col === j
        const isHint = hintCellsRef.current &&
          ((hintCellsRef.current.from.row === i && hintCellsRef.current.from.col === j) ||
           (hintCellsRef.current.to.row === i && hintCellsRef.current.to.col === j))

        const elimState = animStateRef.current.eliminating.find(e => e.row === i && e.col === j)
        const isEliminating = !!elimState

        // 交换动画偏移
        let swapOffset = null
        if (animStateRef.current.swapping) {
          const swap = animStateRef.current.swapping
          if (swap.from.row === i && swap.from.col === j) {
            swapOffset = { x: swap.offset.x * cellSize, y: swap.offset.y * cellSize }
          } else if (swap.to.row === i && swap.to.col === j) {
            swapOffset = { x: -swap.offset.x * cellSize, y: -swap.offset.y * cellSize }
          }
        }

        // 下落动画偏移
        let dropOffset = null
        if (animStateRef.current.dropping) {
          const drop = animStateRef.current.dropping.find(d => d.row === i && d.col === j)
          if (drop) {
            dropOffset = drop.offset
          }
        }

        drawBlock(ctx, colorIndex, j * cellSize, i * cellSize, cellSize, isSelected, isHint,
          isEliminating ? elimState?.progress : animStateRef.current.hintProgress, isEliminating, swapOffset, dropOffset)
      }
    }
  }, [selectedCell])

  // 动画循环
  useEffect(() => {
    let animationId

    const animate = () => {
      if (hintCellsRef.current !== null) {
        animStateRef.current.hintProgress = (animStateRef.current.hintProgress + 0.02) % 1
      }

      // 更新消除动画（缩小效果）
      animStateRef.current.eliminating = animStateRef.current.eliminating.filter(e => {
        e.progress += 0.04  // 缩放动画速度
        return e.progress < 1
      })

      render()
      animationId = requestAnimationFrame(animate)
    }

    animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [render])

  // 处理点击
  const handleClick = useCallback((e) => {
    if (isAnimating) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const col = Math.floor(x / cellSizeRef.current)
    const row = Math.floor(y / cellSizeRef.current)

    if (row < 0 || row >= CONFIG.GRID_SIZE || col < 0 || col >= CONFIG.GRID_SIZE) return

    if (!selectedCell) {
      setSelectedCell({ row, col })
    } else {
      const dr = Math.abs(row - selectedCell.row)
      const dc = Math.abs(col - selectedCell.col)

      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        handleSwap(selectedCell, { row, col })
      } else {
        setSelectedCell({ row, col })
      }
    }
  }, [isAnimating, selectedCell])

  // 处理触摸
  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    if (isAnimating) return

    const touch = e.touches[0]
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const x = touch.clientX - rect.left
    const y = touch.clientY - rect.top

    const col = Math.floor(x / cellSizeRef.current)
    const row = Math.floor(y / cellSizeRef.current)

    if (row < 0 || row >= CONFIG.GRID_SIZE || col < 0 || col >= CONFIG.GRID_SIZE) return

    if (!selectedCell) {
      setSelectedCell({ row, col })
    } else {
      const dr = Math.abs(row - selectedCell.row)
      const dc = Math.abs(col - selectedCell.col)

      if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
        handleSwap(selectedCell, { row, col })
      } else {
        setSelectedCell({ row, col })
      }
    }
  }, [isAnimating, selectedCell])

  // 执行交换并处理消除
  const handleSwap = async (from, to) => {
    setIsAnimating(true)
    setSelectedCell(null)

    const board = boardRef.current

    // 交换动画
    const swapDuration = 150
    const frames = 10
    const dx = to.col - from.col
    const dy = to.row - from.row

    animStateRef.current.swapping = { from, to, offset: { x: 0, y: 0 } }

    for (let i = 1; i <= frames; i++) {
      const progress = i / frames
      const eased = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      animStateRef.current.swapping.offset = {
        x: dx * eased,
        y: dy * eased
      }
      render()
      await new Promise(r => setTimeout(r, swapDuration / frames))
    }

    // 执行数据交换
    const temp = board[from.row][from.col]
    board[from.row][from.col] = board[to.row][to.col]
    board[to.row][to.col] = temp

    animStateRef.current.swapping = null
    render()

    const matches = getMatches(board)

    if (matches.length === 0) {
      // 无效交换，恢复
      board[to.row][to.col] = board[from.row][from.col]
      board[from.row][from.col] = temp
      render()
      // 抖动效果
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      const cellSize = cellSizeRef.current
      for (let i = 0; i < 6; i++) {
        ctx.save()
        ctx.translate(Math.sin(i * Math.PI / 3) * 5, 0)
        render()
        ctx.restore()
        await new Promise(r => setTimeout(r, 30))
      }
      setIsAnimating(false)
      return
    }

    // 处理消除循环
    await processMatches()

    // 检测是否有有效移动
    const hasMove = hasValidMove(board)
    if (!hasMove.valid) {
      setMessage('无可用移动，正在洗牌...')
      const shuffled = shuffleBoard(board)
      boardRef.current = shuffled.board
      if (shuffled.hint) {
        hintCellsRef.current = shuffled.hint
      }
      await new Promise(r => setTimeout(r, 500))
      setMessage('')
    } else {
      hintCellsRef.current = null
    }

    render()
    setIsAnimating(false)
  }

  // 处理匹配消除循环
  const processMatches = async () => {
    while (true) {
      const matches = getMatches(boardRef.current)
      if (matches.length === 0) break

      // 记录消除状态用于动画
      animStateRef.current.eliminating = matches.map(m => ({ ...m, progress: 0 }))

      // 计算得分
      const points = calculateScore(matches, level)
      setScore(prev => {
        const newScore = prev + points
        const newLevel = Math.floor(newScore / 200) + 1
        if (newLevel !== level) {
          setLevel(newLevel)
        }
        return newScore
      })

      // 更新最高分
      setScore(prev => {
        if (prev > bestScore) {
          setBestScore(prev)
          localStorage.setItem(STORAGE_KEY, prev)
        }
        return prev
      })

      // 等待消除动画
      await new Promise(r => setTimeout(r, CONFIG.ANIMATION_SPEED))

      // 标记消除
      matches.forEach(({ row, col }) => {
        boardRef.current[row][col] = -1
      })

      // 计算下落动画
      const oldBoard = boardRef.current.map(row => [...row])
      boardRef.current = applyGravity(boardRef.current)

      // 计算每个格子的下落距离
      const dropAnimations = []
      for (let j = 0; j < CONFIG.GRID_SIZE; j++) {
        let emptyCount = 0
        for (let i = CONFIG.GRID_SIZE - 1; i >= 0; i--) {
          if (oldBoard[i][j] === -1) {
            emptyCount++
          } else if (emptyCount > 0) {
            const newRow = i + emptyCount
            dropAnimations.push({ row: newRow, col: j, offset: 0 })
          }
        }
      }

      // 执行下落动画
      if (dropAnimations.length > 0) {
        animStateRef.current.dropping = dropAnimations
        const dropDuration = 200
        const dropFrames = 12

        for (let f = 1; f <= dropFrames; f++) {
          const progress = f / dropFrames
          const eased = 1 - Math.pow(1 - progress, 2) // easeOutQuad

          dropAnimations.forEach(d => {
            d.offset = (1 - eased) * -1
          })
          render()
          await new Promise(r => setTimeout(r, dropDuration / dropFrames))
        }

        animStateRef.current.dropping = null
      }

      render()
      await new Promise(r => setTimeout(r, CONFIG.ANIMATION_SPEED / 2))
    }
  }

  // 提示功能
  const showHint = useCallback(async () => {
    if (isAnimating) return

    const hasMove = hasValidMove(boardRef.current)

    if (!hasMove.valid) {
      setMessage('无可用移动')
      setTimeout(() => setMessage(''), 2000)
      return
    }

    hintCellsRef.current = hasMove
    animStateRef.current.hintProgress = 0

    // 闪烁3次
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 500))
    }

    hintCellsRef.current = null
    render()
  }, [isAnimating, render])

  // 新游戏
  const newGame = useCallback(() => {
    boardRef.current = initBoard()
    setScore(0)
    setLevel(1)
    setSelectedCell(null)
    setMessage('')
    setIsAnimating(false)
    hintCellsRef.current = null
    animStateRef.current = { eliminating: [], dropY: [], hintProgress: 0, swapping: null, dropping: null }

    // 检测初始是否有有效移动
    setTimeout(() => {
      const hasMove = hasValidMove(boardRef.current)
      if (!hasMove.valid) {
        const shuffled = shuffleBoard(boardRef.current)
        boardRef.current = shuffled.board
      }
      render()
    }, 100)

    render()
  }, [render])

  // 监听分数变化更新最高分
  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score)
      localStorage.setItem(STORAGE_KEY, score)
    }
  }, [score, bestScore])

  return (
    <div className="h-full flex flex-col justify-center items-center p-4">
      {/* 3D立体容器 */}
      <div className="relative w-full rounded-2xl p-5 flex flex-col gap-4 bg-gradient-to-b from-[#3d3d5c] to-[#2d2d4a] shadow-[inset_0_2px_0_rgba(255,255,255,0.1),inset_0_-2px_0_rgba(0,0,0,0.3),0_10px_0_#1e1e36,0_15px_30px_rgba(0,0,0,0.4)]">
        {/* 容器内阴影层 */}
        <div className="absolute inset-0 rounded-2xl shadow-[inset_0_0_30px_rgba(0,0,0,0.2)] pointer-events-none" />

        {/* 顶部信息栏 */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 左侧：分数统计 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative bg-gradient-to-b from-[#4a4a6a] to-[#3a3a5a] rounded-lg px-4 py-2 text-center min-w-[70px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_3px_0_#252540]">
              <div className="text-[rgba(255,255,255,0.7)] text-xs">分数</div>
              <div className="text-white text-lg font-bold">{score}</div>
            </div>
            <div className="relative bg-gradient-to-b from-[#4a4a6a] to-[#3a3a5a] rounded-lg px-4 py-2 text-center min-w-[70px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_3px_0_#252540]">
              <div className="text-[rgba(255,255,255,0.7)] text-xs">最高</div>
              <div className="text-white text-lg font-bold">{bestScore}</div>
            </div>
            <div className="relative bg-gradient-to-b from-[#5a4a1a] to-[#4a3a0a] rounded-lg px-4 py-2 text-center min-w-[70px] shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_3px_0_#302a05]">
              <div className="text-[rgba(255,215,0,0.9)] text-xs">等级</div>
              <div className="text-[#ffd700] text-lg font-bold">{level}</div>
            </div>
          </div>

          {/* 右侧：按钮 */}
          <div className="flex gap-2">
            <button
              onClick={newGame}
              disabled={isAnimating}
              className="px-5 py-2.5 bg-gradient-to-b from-[#4a5568] to-[#2d3748] text-white rounded-lg font-medium cursor-pointer transition-all duration-100 border-t border-[#718096] shadow-[0_4px_0_#1a202c,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#1a202c,0_6px_15px_rgba(0,0,0,0.4)] active:shadow-[0_2px_0_#1a202c,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              新游戏
            </button>
            <button
              onClick={showHint}
              disabled={isAnimating}
              className="px-5 py-2.5 bg-gradient-to-b from-[#38b2ac] to-[#2c7a7b] text-white rounded-lg font-medium cursor-pointer transition-all duration-100 border-t border-[#4fd1c5] shadow-[0_4px_0_#285e61,0_5px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_#285e61,0_6px_15px_rgba(0,0,0,0.4)] active:shadow-[0_2px_0_#285e61,0_2px_5px_rgba(0,0,0,0.3)] active:translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              提示
            </button>
          </div>
        </div>

        {/* 游戏区域 */}
        <div
          ref={containerRef}
          className="overflow-auto bg-[rgba(255,255,255,0.05)] rounded-xl p-3 min-h-[300px]"
          style={{ background: 'linear-gradient(135deg, rgba(26,26,46,0.8), rgba(22,33,62,0.8))' }}
        >
          <canvas
            ref={canvasRef}
            onClick={handleClick}
            onTouchStart={handleTouchStart}
            className="cursor-pointer touch-none mx-auto block"
            style={{ borderRadius: '8px' }}
          />
        </div>

        {/* 消息提示 */}
        {message && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[rgba(0,0,0,0.8)] text-white px-6 py-3 rounded-lg text-lg font-medium z-50">
            {message}
          </div>
        )}

        {/* 操作说明 */}
        <div className="text-[#666] text-sm text-center">
          <span className="text-[#00ffff]">点击</span>或<span className="text-[#00ffff]">触摸</span>选择方块，点击相邻方块交换，三个及以上相同颜色消除
        </div>
      </div>
    </div>
  )
}