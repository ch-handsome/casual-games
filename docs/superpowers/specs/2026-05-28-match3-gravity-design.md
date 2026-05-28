# 消消乐游戏物理掉落机制改进设计

## 背景

当前的消消乐游戏在消除方块后，旧方块有下落动画，但顶部新方块是瞬间出现的，没有从顶部滑入的物理效果。需要改进为经典消消乐的两阶段物理掉落机制。

## 当前问题

- **位置**: `src/page/games/eliminate.jsx` 的 `applyGravity` 函数（110-129行）
- **问题**: 新方块通过 `unshift` 直接插入列顶部，瞬间出现

```javascript
// 当前代码的问题
while (column.length < CONFIG.GRID_SIZE) {
  column.unshift(Math.floor(Math.random() * CONFIG.COLORS)) // 瞬间出现在顶部
}
```

## 需求

1. 消除方块后，上方的方块向下掉落填补空格
2. 掉落动画：方块从当前位置平滑移动到目标位置（已有，保留）
3. 掉落完成后，顶部空缺位置生成新随机方块
4. 新方块从最顶部出现，向下滑入填补（当前缺失）
5. 如果掉落产生新消除，继续触发连锁消除+掉落循环（已有，保留）

## 设计方案

### 核心思路：两阶段下落

**第一阶段：现有方块下落填补**
- 扫描每一列，计算每个方块下方有多少个空位（-1）
- 已有方块从原位置向下移动填补空位
- 使用 easeOut 缓动动画（减速停止效果）

**第二阶段：新方块从顶部滑入**
- 第一阶段动画完成后，识别哪些行/列需要生成新方块
- 新方块初始位置在 `y = -1`（棋盘上方一个格子外部）
- 新方块使用 easeIn 缓动动画向下加速滑入到目标位置
- 模拟真实重力加速效果

### 数据结构改进

**动画状态增强** (`animStateRef.current`):

```javascript
{
  eliminating: [{ row, col, progress }],  // 消除动画（已有）
  dropping: [{ row, col, offset }],        // 现有方块下落（已有）
  fallingFromTop: [{ row, col, offset }],  // 新增：从顶部滑入的方块
  swapping: { from, to, offset }           // 交换动画（已有）
}
```

**返回值结构改进** (`applyGravity`):

```javascript
// 返回值
{
  board: [...],                          // 更新后的棋盘数据
  dropAnimations: [{ fromRow, toRow, col }],  // 现有方块下落关系
  newBlocks: [{ row, col, color }]       // 新生成方块的位置和颜色
}
```

### 关键算法

**计算下落关系**:
```javascript
function calculateDropMoves(board) {
  const dropMoves = []   // 现有方块下落
  const newBlocks = []   // 新方块生成

  for (let col = 0; col < GRID_SIZE; col++) {
    let emptyCount = 0
    // 从下往上扫描
    for (let row = GRID_SIZE - 1; row >= 0; row--) {
      if (board[row][col] === -1) {
        emptyCount++  // 记录空位数
      } else if (emptyCount > 0) {
        // 已有方块需要下落
        dropMoves.push({
          fromRow: row,
          toRow: row + emptyCount,
          col: col
        })
      }
    }
    // 顶部空缺需要生成新方块
    for (let i = 0; i < emptyCount; i++) {
      newBlocks.push({
        row: i,
        col: col,
        color: Math.floor(Math.random() * COLORS)
      })
    }
  }

  return { dropMoves, newBlocks }
}
```

### 动画时序

1. **消除动画** (200ms): 现有方块缩小+淡出
2. **现有方块下落** (250ms): easeOutQuad 缓动
3. **新方块滑入** (300ms): easeInQuad 缓动，从 y=-1 滑入
4. **连锁检测**: 新方块落定后重新检查匹配，如有则重复步骤1-4

### 渲染层改动

**`drawBlock` 函数增强**:
- 添加 `fallFromTop` 参数，当存在时：
  - 计算 `renderY = (row + offset) * cellSize`
  - offset 范围从 -1 到 0

### 配置参数建议

```javascript
CONFIG = {
  // ... 现有配置
  DROP_ANIMATION_DURATION: 250,   // 现有方块下落时间(ms)
  FALL_FROM_TOP_DURATION: 300,    // 新方块从顶部滑入时间(ms)
  DROP_EASING: 'easeOutQuad',     // 下落缓动
  FALL_EASING: 'easeInQuad'       // 滑入缓动（加速效果）
}
```

## 影响范围

- `src/page/games/eliminate.jsx`
  - `applyGravity` 函数：完全重写
  - `processMatches` 函数：适配新的动画流程
  - `drawBlock` 函数：支持顶部滑入渲染
  - 动画循环：增加 `fallingFromTop` 状态处理

## 测试要点

1. 单次消除后新方块从顶部滑入
2. 多行同时消除时，新方块分别从顶部滑入
3. 连锁消除时，每轮新方块都正确滑入
4. 动画期间不能进行交互
5. 棋盘刷新后初始状态正常

## 替代方案（未采用）

**方案B：统一下落动画**
- 所有方块（包括新生成的）一起做下落动画
- 缺点：新方块需要预先"存在于屏幕外"，逻辑复杂，视觉效果不如两阶段自然

**方案C：列动画**
- 整列一起移动，但需要处理列内相对位置变化
- 缺点：实现复杂度高，收益不大

采用方案A（两阶段）是因为它最符合经典消消乐的用户心智，视觉效果自然，且实现相对简洁。