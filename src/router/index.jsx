import { Navigate, createHashRouter } from 'react-router-dom'
import GameSnake from '../page/games/snake'
import Game2048 from '../page/games/2048'
import GameTetris from '../page/games/tetris'
import Layout from '../components/Layout'
import { config } from './config'

const elements = {
  '2048': <Game2048 />,
  'snake': <GameSnake />,
  'tetris': <GameTetris />,
}

export const routes = [
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/2048" replace /> },
      ...config.map(game => ({
        path: game.path,
        element: elements[game.path],
        name: game.name,
        icon: game.icon,
      })),
    ]
  },
]

export const router = createHashRouter(routes)