import { NavLink, useLocation, Outlet } from "react-router-dom";
import { config } from "../router/config";

const gameTabs = config.map((game) => ({
  path: `/${game.path}`,
  name: game.name,
  icon: game.icon,
}));

export default function Layout() {
  const location = useLocation();
  const currentPath = location.pathname;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap justify-center gap-5 py-[30px] px-5 max-sm:gap-3">
        {gameTabs.map((game) => (
          <NavLink
            key={game.path}
            to={game.path}
            className={`
              w-[100px] h-[100px] max-sm:w-[80px] max-sm:h-[80px]
              bg-white/10 backdrop-blur-md rounded-2xl
              flex flex-col items-center justify-center
              cursor-pointer transition-all duration-300 ease
              border-2
              hover:-translate-y-1 hover:bg-white/15
              text-decoration-none
              ${
                currentPath === game.path
                  ? "border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.4)]"
                  : "border-transparent"
              }
            `}
          >
            <span className="text-[40px] max-sm:text-[32px]">{game.icon}</span>
            <span className="text-white text-sm max-sm:text-xs font-medium">
              {game.name}
            </span>
          </NavLink>
        ))}
      </div>
      <div className="flex-1 flex justify-center items-center overflow-auto p-5 pt-0">
        <Outlet />
      </div>
    </div>
  );
}
