import { useState, useEffect, useCallback, useRef } from 'react'
import playerImg from '@/assets/thunderbolt/player.png'
import shieldImg from '@/assets/thunderbolt/shield.png'
import enemy1Img from '@/assets/thunderbolt/enemy1.png'
import enemy2Img from '@/assets/thunderbolt/enemy2.png'
import enemy3Img from '@/assets/thunderbolt/enemy3.png'
import enemy4Img from '@/assets/thunderbolt/enemy4.png'

const STORAGE_KEY = 'thunderbolt-best-score'
const CANVAS_WIDTH = 1000
const CANVAS_HEIGHT = 550
const PLAYER_SIZE = 20
const BULLET_RADIUS = 4
const ENEMY_TYPES = {
  small: { color: '#e85d75', hp: 1, score: 10, speed: 3, width: 30, height: 30 },
  medium: { color: '#f0a04e', hp: 3, score: 30, speed: 2, width: 40, height: 40 },
  large: { color: '#a855f7', hp: 5, score: 50, speed: 1.5, width: 50, height: 50 },
  elite: { color: '#22d3d3', hp: 8, score: 100, speed: 1.2, width: 45, height: 45 },
}
const POWERUPS = {
  weapon: { color: '#e85d75', duration: 0 },
  shield: { color: '#4e9ef0', duration: 10000 },
  health: { color: '#50c878', duration: 0 },
  speed: { color: '#ffe066', duration: 8000 },
}

export default function Thunderbolt() {
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [weaponLevel, setWeaponLevel] = useState(1)
  const [isPaused, setIsPaused] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [fireRate, setFireRate] = useState('正常')

  const canvasRef = useRef(null)
  const gameStateRef = useRef({
    player: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, invincible: false, invincibleTimer: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [],
    powerups: [],
    particles: [],
    stars: [],
    score: 0,
    lives: 3,
    weaponLevel: 1,
    shieldActive: false,
    shieldTimer: 0,
    speedActive: false,
    speedTimer: 0,
    fireRateMultiplier: 1,
    lastFireTime: 0,
    spawnTimer: 0,
    isPaused: false,
    isGameOver: false,
    keys: {},
  })

  const gameLoopRef = useRef(null)
  const lastTimeRef = useRef(0)
  const imagesRef = useRef({})

  // 图片素材 - Vite 导入的 URL 创建 Image 对象
  useEffect(() => {
    const load = (key, src) => {
      const img = new Image()
      img.src = src
      imagesRef.current[key] = { img, loaded: true }
    }
    load('player', playerImg)
    load('shield', shieldImg)
    load('enemy1', enemy1Img)
    load('enemy2', enemy2Img)
    load('enemy3', enemy3Img)
    load('enemy4', enemy4Img)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setBestScore(parseInt(saved))
    initStars()
  }, [])

  const initStars = () => {
    const stars = []
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 2 + 1,
      })
    }
    gameStateRef.current.stars = stars
  }

  const startGame = useCallback(() => {
    const state = gameStateRef.current
    state.player = { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT - 60, invincible: false, invincibleTimer: 0 }
    state.bullets = []
    state.enemyBullets = []
    state.enemies = []
    state.powerups = []
    state.particles = []
    state.score = 0
    state.lives = 3
    state.weaponLevel = 1
    state.shieldActive = false
    state.shieldTimer = 0
    state.speedActive = false
    state.speedTimer = 0
    state.fireRateMultiplier = 1
    state.lastFireTime = 0
    state.spawnTimer = 0
    state.isPaused = false
    state.isGameOver = false

    setScore(0)
    setLives(3)
    setWeaponLevel(1)
    setIsPaused(false)
    setIsGameOver(false)
    setFireRate('正常')
    initStars()

    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    lastTimeRef.current = performance.now()
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [])

  const fireBullet = useCallback((state, currentTime) => {
    const fireInterval = state.speedActive ? 1000 / 24 : 1000 / 12
    if (currentTime - state.lastFireTime < fireInterval) return

    state.lastFireTime = currentTime
    const player = state.player

    if (state.weaponLevel === 1) {
      state.bullets.push({ x: player.x, y: player.y - 15, vy: -10, trail: [] })
    } else if (state.weaponLevel === 2) {
      state.bullets.push({ x: player.x - 10, y: player.y - 15, vy: -10, trail: [] })
      state.bullets.push({ x: player.x + 10, y: player.y - 15, vy: -10, trail: [] })
    } else {
      state.bullets.push({ x: player.x - 12, y: player.y - 15, vy: -10, vx: -1, trail: [] })
      state.bullets.push({ x: player.x, y: player.y - 15, vy: -10, trail: [] })
      state.bullets.push({ x: player.x + 12, y: player.y - 15, vy: -10, vx: 1, trail: [] })
    }
  }, [])

  const spawnEnemy = useCallback((state) => {
    const types = ['small', 'small', 'small', 'medium', 'medium', 'large', 'elite']
    const rand = Math.random()
    let type
    if (rand < 0.5) type = 'small'
    else if (rand < 0.75) type = 'medium'
    else if (rand < 0.9) type = 'large'
    else type = 'elite'

    const config = ENEMY_TYPES[type]
    const enemy = {
      type,
      x: Math.random() * (CANVAS_WIDTH - config.width) + config.width / 2,
      y: -config.height,
      ...config,
      hp: config.hp,
      shootTimer: Math.random() * 2000,
      angle: 0,
    }
    state.enemies.push(enemy)
  }, [])

  const spawnPowerup = useCallback((x, y) => {
    const types = ['weapon', 'shield', 'health', 'speed']
    const rand = Math.random()
    let type
    if (rand < 0.4) type = 'weapon'
    else if (rand < 0.6) type = 'shield'
    else if (rand < 0.8) type = 'health'
    else type = 'speed'

    gameStateRef.current.powerups.push({
      type,
      x,
      y,
      ...POWERUPS[type],
    })
  }, [])

  const createExplosion = useCallback((x, y, color, count = 15) => {
    const state = gameStateRef.current
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = Math.random() * 3 + 2
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.02 + Math.random() * 0.02,
        color,
        size: Math.random() * 4 + 2,
      })
    }
  }, [])

  const update = useCallback((deltaTime) => {
    const state = gameStateRef.current
    if (state.isPaused || state.isGameOver) return

    const currentTime = performance.now()

    // Update player
    if (state.keys['KeyA'] || state.keys['ArrowLeft']) {
      state.player.x = Math.max(PLAYER_SIZE / 2, state.player.x - 8)
    }
    if (state.keys['KeyD'] || state.keys['ArrowRight']) {
      state.player.x = Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, state.player.x + 8)
    }
    if (state.keys['KeyW'] || state.keys['ArrowUp']) {
      state.player.y = Math.max(PLAYER_SIZE / 2, state.player.y - 8)
    }
    if (state.keys['KeyS'] || state.keys['ArrowDown']) {
      state.player.y = Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, state.player.y + 8)
    }

    // Player invincibility
    if (state.player.invincible) {
      state.player.invincibleTimer -= deltaTime
      if (state.player.invincibleTimer <= 0) {
        state.player.invincible = false
      }
    }

    // Shield timer
    if (state.shieldActive) {
      state.shieldTimer -= deltaTime
      if (state.shieldTimer <= 0) {
        state.shieldActive = false
      }
    }

    // Speed timer
    if (state.speedActive) {
      state.speedTimer -= deltaTime
      if (state.speedTimer <= 0) {
        state.speedActive = false
        state.fireRateMultiplier = 1
        setFireRate('正常')
      }
    }

    // Fire bullet
    fireBullet(state, currentTime)

    // Update player bullets
    state.bullets = state.bullets.filter(bullet => {
      bullet.trail.unshift({ x: bullet.x, y: bullet.y })
      if (bullet.trail.length > 5) bullet.trail.pop()

      bullet.y += bullet.vy
      if (bullet.vx) bullet.x += bullet.vx
      return bullet.y > -10 && bullet.x > 0 && bullet.x < CANVAS_WIDTH
    })

    // Update enemy bullets
    state.enemyBullets = state.enemyBullets.filter(bullet => {
      bullet.y += bullet.vy
      return bullet.y < CANVAS_HEIGHT + 10
    })

    // Update stars
    state.stars.forEach(star => {
      star.y += star.speed
      if (star.y > CANVAS_HEIGHT) {
        star.y = 0
        star.x = Math.random() * CANVAS_WIDTH
      }
    })

    // Spawn enemies
    state.spawnTimer += deltaTime
    const spawnDelay = Math.max(400, 1500 - Math.floor(state.score / 200) * 30)
    if (state.spawnTimer >= spawnDelay) {
      state.spawnTimer = 0
      spawnEnemy(state)
    }

    // Update enemies
    state.enemies.forEach(enemy => {
      if (enemy.type === 'small') {
        enemy.y += enemy.speed
      } else if (enemy.type === 'medium') {
        enemy.y += enemy.speed
        enemy.angle += 0.05
        enemy.x += Math.sin(enemy.angle) * 2
      } else if (enemy.type === 'large') {
        enemy.y += enemy.speed
      } else if (enemy.type === 'elite') {
        enemy.y += enemy.speed
        const dx = state.player.x - enemy.x
        enemy.x += Math.sign(dx) * Math.min(Math.abs(dx) * 0.02, 2)
      }

      // Enemy shooting
      enemy.shootTimer -= deltaTime
      if (enemy.shootTimer <= 0) {
        enemy.shootTimer = 1500 + Math.random() * 1000
        if (enemy.type !== 'small') {
          state.enemyBullets.push({
            x: enemy.x,
            y: enemy.y + enemy.height / 2,
            vy: 5,
          })
        }
        if (enemy.type === 'large') {
          state.enemyBullets.push({
            x: enemy.x - 10,
            y: enemy.y + enemy.height / 2,
            vy: 5,
          })
          state.enemyBullets.push({
            x: enemy.x + 10,
            y: enemy.y + enemy.height / 2,
            vy: 5,
          })
        }
      }
    })

    // Remove off-screen enemies
    state.enemies = state.enemies.filter(enemy => enemy.y < CANVAS_HEIGHT + 50)

    // Update powerups
    state.powerups = state.powerups.filter(p => {
      p.y += 2
      return p.y < CANVAS_HEIGHT + 20
    })

    // Update particles
    state.particles = state.particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.life -= p.decay
      return p.life > 0
    })

    // Collision detection
    // Player bullets vs enemies
    state.bullets = state.bullets.filter(bullet => {
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i]
        const dx = bullet.x - enemy.x
        const dy = bullet.y - enemy.y
        if (Math.abs(dx) < enemy.width / 2 && Math.abs(dy) < enemy.height / 2) {
          enemy.hp--
          if (enemy.hp <= 0) {
            createExplosion(enemy.x, enemy.y, enemy.color, 20)
            state.score += enemy.score
            setScore(state.score)

            // Drop powerup chance
            if (Math.random() < 0.15) {
              spawnPowerup(enemy.x, enemy.y)
            }

            state.enemies.splice(i, 1)

            if (state.score > bestScore) {
              setBestScore(state.score)
              localStorage.setItem(STORAGE_KEY, state.score.toString())
            }
          } else {
            createExplosion(bullet.x, bullet.y, '#ffff00', 5)
          }
          return false
        }
      }
      return true
    })

    // Player vs enemies
    if (!state.player.invincible) {
      for (let i = state.enemies.length - 1; i >= 0; i--) {
        const enemy = state.enemies[i]
        const dx = state.player.x - enemy.x
        const dy = state.player.y - enemy.y
        if (Math.abs(dx) < (PLAYER_SIZE + enemy.width) / 2 - 5 &&
            Math.abs(dy) < (PLAYER_SIZE + enemy.height) / 2 - 5) {
          createExplosion(enemy.x, enemy.y, enemy.color, 25)
          state.enemies.splice(i, 1)

          if (state.shieldActive) {
            state.shieldActive = false
          } else {
            state.lives--
            setLives(state.lives)
            state.player.invincible = true
            state.player.invincibleTimer = 1500

            if (state.lives <= 0) {
              state.isGameOver = true
              setIsGameOver(true)
            }
          }
        }
      }
    }

    // Player vs enemy bullets
    if (!state.player.invincible) {
      state.enemyBullets = state.enemyBullets.filter(bullet => {
        const dx = bullet.x - state.player.x
        const dy = bullet.y - state.player.y
        if (Math.abs(dx) < PLAYER_SIZE / 2 && Math.abs(dy) < PLAYER_SIZE / 2) {
          if (state.shieldActive) {
            state.shieldActive = false
            createExplosion(bullet.x, bullet.y, '#4e9ef0', 10)
            return false
          }
          state.lives--
          setLives(state.lives)
          state.player.invincible = true
          state.player.invincibleTimer = 1500
          createExplosion(state.player.x, state.player.y, '#ff0000', 15)

          if (state.lives <= 0) {
            state.isGameOver = true
            setIsGameOver(true)
          }
          return false
        }
        return true
      })
    }

    // Player vs powerups
    state.powerups = state.powerups.filter(powerup => {
      const dx = powerup.x - state.player.x
      const dy = powerup.y - state.player.y
      if (Math.abs(dx) < (PLAYER_SIZE + 20) / 2 && Math.abs(dy) < (PLAYER_SIZE + 20) / 2) {
        createExplosion(powerup.x, powerup.y, powerup.color, 10)

        switch (powerup.type) {
          case 'weapon':
            if (state.weaponLevel < 3) {
              state.weaponLevel++
              setWeaponLevel(state.weaponLevel)
            }
            break
          case 'shield':
            state.shieldActive = true
            state.shieldTimer = powerup.duration
            break
          case 'health':
            if (state.lives < 3) {
              state.lives++
              setLives(state.lives)
            }
            break
          case 'speed':
            state.speedActive = true
            state.speedTimer = powerup.duration
            state.fireRateMultiplier = 2
            setFireRate('双倍')
            break
        }
        return false
      }
      return true
    })

  }, [createExplosion, fireBullet, spawnEnemy, spawnPowerup, bestScore])

  const draw = useCallback((ctx) => {
    const state = gameStateRef.current

    // Clear canvas
    ctx.fillStyle = '#0a0a1a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw stars
    state.stars.forEach(star => {
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + star.size / 4})`
      ctx.beginPath()
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw particles
    state.particles.forEach(p => {
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      ctx.fill()
    })
    ctx.globalAlpha = 1

    // Draw powerups
    state.powerups.forEach(p => {
      ctx.fillStyle = p.color
      ctx.fillRect(p.x - 10, p.y - 10, 20, 20)
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.strokeRect(p.x - 10, p.y - 10, 20, 20)

      // Icon
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const icons = { weapon: 'W', shield: 'S', health: 'H', speed: 'F' }
      ctx.fillText(icons[p.type], p.x, p.y)
    })

    // Draw enemies
    state.enemies.forEach(enemy => {
      // 获取对应的图片
      const typeMap = { small: 'enemy1', medium: 'enemy2', large: 'enemy3', elite: 'enemy4' }
      const imgData = imagesRef.current[typeMap[enemy.type]]
      const size = enemy.width

      if (imgData && imgData.loaded) {
        ctx.drawImage(imgData.img, enemy.x - size / 2, enemy.y - size / 2, size, size)
      } else {
        // Fallback: 绘制原形状
        ctx.fillStyle = enemy.color

        if (enemy.type === 'small') {
          ctx.beginPath()
          ctx.moveTo(enemy.x, enemy.y + enemy.height / 2)
          ctx.lineTo(enemy.x - enemy.width / 2, enemy.y - enemy.height / 2)
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y - enemy.height / 2)
          ctx.closePath()
          ctx.fill()
        } else if (enemy.type === 'medium') {
          ctx.beginPath()
          ctx.moveTo(enemy.x, enemy.y - enemy.height / 2)
          ctx.lineTo(enemy.x + enemy.width / 2, enemy.y)
          ctx.lineTo(enemy.x, enemy.y + enemy.height / 2)
          ctx.lineTo(enemy.x - enemy.width / 2, enemy.y)
          ctx.closePath()
          ctx.fill()
        } else if (enemy.type === 'large') {
          ctx.beginPath()
          for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2
            const x = enemy.x + Math.cos(angle) * enemy.width / 2
            const y = enemy.y + Math.sin(angle) * enemy.height / 2
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
        } else if (enemy.type === 'elite') {
          ctx.beginPath()
          for (let i = 0; i < 10; i++) {
            const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2
            const r = i % 2 === 0 ? enemy.width / 2 : enemy.width / 4
            const x = enemy.x + Math.cos(angle) * r
            const y = enemy.y + Math.sin(angle) * r
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }
          ctx.closePath()
          ctx.fill()
        }
      }

      // Health bar for multi-hp enemies
      if (enemy.hp < ENEMY_TYPES[enemy.type].hp) {
        const barWidth = enemy.width
        const barHeight = 4
        ctx.fillStyle = '#333'
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 10, barWidth, barHeight)
        ctx.fillStyle = '#00ff00'
        ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.height / 2 - 10,
          barWidth * (enemy.hp / ENEMY_TYPES[enemy.type].hp), barHeight)
      }
    })

    // Draw enemy bullets
    ctx.fillStyle = '#ff6b6b'
    state.enemyBullets.forEach(bullet => {
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw player bullets with trails
    state.bullets.forEach(bullet => {
      // Trail
      bullet.trail.forEach((t, i) => {
        ctx.fillStyle = `rgba(255, 255, 0, ${0.5 - i * 0.1})`
        ctx.beginPath()
        ctx.arc(t.x, t.y, BULLET_RADIUS - i * 0.5, 0, Math.PI * 2)
        ctx.fill()
      })

      // Bullet
      ctx.fillStyle = '#ffff00'
      ctx.beginPath()
      ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2)
      ctx.fill()
    })

    // Draw player
    if (!state.player.invincible || Math.floor(Date.now() / 100) % 2 === 0) {
      // Draw engine flame particles
      const flameSize = state.speedActive ? 15 : 10
      const flicker = Math.random() * 3
      ctx.fillStyle = state.speedActive ? '#ff6600' : '#ff9900'
      ctx.beginPath()
      ctx.moveTo(state.player.x - 5, state.player.y + PLAYER_SIZE / 2)
      ctx.lineTo(state.player.x, state.player.y + PLAYER_SIZE / 2 + flameSize + flicker)
      ctx.lineTo(state.player.x + 5, state.player.y + PLAYER_SIZE / 2)
      ctx.closePath()
      ctx.fill()

      ctx.fillStyle = state.speedActive ? '#ffff00' : '#ffaa00'
      ctx.beginPath()
      ctx.moveTo(state.player.x - 3, state.player.y + PLAYER_SIZE / 2)
      ctx.lineTo(state.player.x, state.player.y + PLAYER_SIZE / 2 + flameSize / 2 + flicker)
      ctx.lineTo(state.player.x + 3, state.player.y + PLAYER_SIZE / 2)
      ctx.closePath()
      ctx.fill()

      // 绘制玩家飞船 - 使用图片或 fallback
      const playerImgData = imagesRef.current['player']
      if (playerImgData && playerImgData.loaded) {
        const playerImgSize = PLAYER_SIZE * 2.5
        ctx.drawImage(playerImgData.img, state.player.x - playerImgSize / 2, state.player.y - playerImgSize / 2, playerImgSize, playerImgSize)
      } else {
        // Fallback: 绘制三角形飞船
        ctx.fillStyle = '#00e5f0'
        ctx.beginPath()
        ctx.moveTo(state.player.x, state.player.y - PLAYER_SIZE / 2)
        ctx.lineTo(state.player.x - PLAYER_SIZE / 2, state.player.y + PLAYER_SIZE / 2)
        ctx.lineTo(state.player.x + PLAYER_SIZE / 2, state.player.y + PLAYER_SIZE / 2)
        ctx.closePath()
        ctx.fill()

        // Cockpit
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(state.player.x, state.player.y, 5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Shield effect - 使用图片或 fallback
    if (state.shieldActive) {
      const shieldImgData = imagesRef.current['shield']
      const shieldSize = PLAYER_SIZE * 2.5

      if (shieldImgData && shieldImgData.loaded) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3
        ctx.drawImage(shieldImgData.img, state.player.x - shieldSize / 2, state.player.y - shieldSize / 2, shieldSize, shieldSize)
        ctx.globalAlpha = 1
      } else {
        // Fallback: 绘制圆形护盾
        ctx.strokeStyle = '#4e9ef0'
        ctx.lineWidth = 3
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 100) * 0.3
        ctx.beginPath()
        ctx.arc(state.player.x, state.player.y, PLAYER_SIZE, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    // Game over overlay
    if (state.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      ctx.fillStyle = '#ff4757'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('游戏结束', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)

      ctx.fillStyle = '#ffffff'
      ctx.font = '24px Arial'
      ctx.fillText(`最终得分: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20)
      ctx.fillText('点击"新游戏"重新开始', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60)
    }

    // Pause overlay
    if (state.isPaused && !state.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 48px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('暂停', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2)
    }

  }, [])

  const gameLoop = useCallback((timestamp) => {
    const deltaTime = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp

    update(deltaTime)

    const canvas = canvasRef.current
    if (canvas) {
      const ctx = canvas.getContext('2d')
      draw(ctx)
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [update, draw])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const state = gameStateRef.current
      state.keys[e.code] = true

      if (e.code === 'KeyP') {
        state.isPaused = !state.isPaused
        setIsPaused(state.isPaused)
      }
    }

    const handleKeyUp = (e) => {
      const state = gameStateRef.current
      state.keys[e.code] = false
    }

    const handleMouseMove = (e) => {
      const state = gameStateRef.current
      if (state.isGameOver || state.isPaused) return

      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const x = (e.clientX - rect.left) * scaleX
      state.player.x = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, x))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseMove = (e) => {
      const state = gameStateRef.current
      if (state.isGameOver || state.isPaused) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const x = (e.clientX - rect.left) * scaleX
      state.player.x = Math.max(PLAYER_SIZE / 2, Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, x))
    }

    canvas.addEventListener('mousemove', handleMouseMove)
    return () => canvas.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    startGame()
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current)
    }
  }, [startGame])

  const togglePause = () => {
    const state = gameStateRef.current
    state.isPaused = !state.isPaused
    setIsPaused(state.isPaused)
  }

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col items-center p-5 bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#0f0f23]">
      <div className="bg-gradient-to-b from-[rgba(30,30,60,0.9)] to-[rgba(20,20,40,0.95)] rounded-2xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] border border-[rgba(100,100,200,0.3)]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 px-4 py-3 bg-[rgba(0,0,0,0.3)] rounded-lg border border-[rgba(100,100,200,0.2)]">
          <div className="flex gap-2">
            {Array(3).fill(0).map((_, i) => (
              <span key={i} className={`text-2xl ${i < lives ? 'opacity-100' : 'opacity-30 grayscale'}`}>❤️</span>
            ))}
          </div>
          <div className="text-white text-lg font-bold">
            <span className="text-[#00e5f0]">分数:</span> {score}
            <span className="mx-4 text-[#666]">|</span>
            <span className="text-[#ffe066]">最高:</span> {bestScore}
            <span className="mx-4 text-[#666]">|</span>
            <span className="text-[#a855f7]">等级:</span> {weaponLevel}
          </div>
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block rounded-lg border-2 border-[rgba(100,100,200,0.4)] shadow-[0_0_20px_rgba(0,229,240,0.2),inset_0_0_60px_rgba(0,0,0,0.5)] cursor-none"
        />

        {/* Controls */}
        <div className="flex justify-between items-center mt-4 px-4 py-3 bg-[rgba(0,0,0,0.3)] rounded-lg border border-[rgba(100,100,200,0.2)]">
          <div className="flex gap-3">
            <button
              onClick={startGame}
              className="px-5 py-2.5 text-base font-bold bg-gradient-to-b from-[#00e5f0] to-[#00b8d4] text-black border-none rounded-lg cursor-pointer shadow-[0_4px_15px_rgba(0,229,240,0.4)] hover:scale-105 transition-all"
            >
              新游戏
            </button>
            <button
              onClick={togglePause}
              className="px-5 py-2.5 text-base font-bold bg-gradient-to-b from-[#ffe066] to-[#f0a04e] text-black border-none rounded-lg cursor-pointer shadow-[0_4px_15px_rgba(255,224,102,0.4)] hover:scale-105 transition-all"
            >
              {isPaused ? '继续' : '暂停'}
            </button>
          </div>
          <div className="text-white text-base">
            <span className="text-[#ffe066]">射速:</span> {fireRate}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-5 text-white/60 text-sm text-center">
        <p>鼠标移动 或 WASD/方向键 控制 | P 键暂停 | 🔴 武器升级 | 🔵 护盾 | 🟢 回血 | 🟡 射速翻倍</p>
      </div>
    </div>
  )
}