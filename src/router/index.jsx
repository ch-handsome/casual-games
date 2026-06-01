import { createHashRouter } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/page/home";
import GameSnake from "@/page/games/snake";
import Game2048 from "@/page/games/2048";
import GameTetris from "@/page/games/tetris";
import GameEliminate from "@/page/games/eliminate";
import GameThunderbolt from "@/page/games/thunderbolt";
import icon2048 from "@/assets/icon/2048.png";
import iconEliminate from "@/assets/icon/eliminate.png";
import iconSnake from "@/assets/icon/snake.png";
import iconTetris from "@/assets/icon/tetris.png";
import iconThunderbolt from "@/assets/icon/thunderbolt.png";

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
  {
    path: "thunderbolt",
    name: "雷电",
    icon: iconThunderbolt,
    element: <GameThunderbolt />,
  },
];

export const routes = [
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/game",
    element: <Layout/>,
    children: [
      ...config.map((game) => ({ ...game })),
    ],
  },
];

export const router = createHashRouter(routes);
