import { Navigate, createHashRouter } from "react-router-dom";
import Layout from "../components/Layout";
import GameSnake from "../page/games/snake";
import Game2048 from "../page/games/2048";
import GameTetris from "../page/games/tetris";
import GameEliminate from "../page/games/eliminate";
import icon2048 from "../assets/icon/2048.png";
import iconEliminate from "../assets/icon/eliminate.png";
import iconSnake from "../assets/icon/snake.png";
import iconTetris from "../assets/icon/tetris.png";

export const config = [
  {
    path: "2048",
    name: "2048",
    icon: icon2048,
    element: <Game2048 />,
  },
  {
    path: "eliminate",
    name: "消消乐",
    icon: iconEliminate,
    element: <GameEliminate />,
  },
  {
    path: "snake",
    name: "贪吃蛇",
    icon: iconSnake,
    element: <GameSnake />,
  },
  {
    path: "tetris",
    name: "俄罗斯方块",
    icon: iconTetris,
    element: <GameTetris />,
  },
];

export const routes = [
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/2048" replace /> },
      ...config.map((game) => ({ ...game })),
    ],
  },
];

export const router = createHashRouter(routes);
