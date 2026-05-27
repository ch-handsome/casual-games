import { NavLink, useLocation, Outlet } from "react-router-dom";
import { config } from "../router/config";

export default function Layout() {
  const location = useLocation();

  const isActive = (path) => location.pathname === `/${path}`;

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap justify-center gap-5 py-[30px] px-5 max-sm:gap-3">
        {config.map((game) => (
          <NavLink
            key={game.path}
            to={game.path}
            className={`
              group relative w-[100px] h-[100px] max-sm:w-[80px] max-sm:h-[80px]
              rounded-2xl flex flex-col items-center justify-center
              cursor-pointer text-decoration-none select-none
              transition-all duration-200 ease-out
              ${isActive(game.path)
                ? "bg-gradient-to-b from-[#2a2a3e] to-[#1a1a2e]"
                : "bg-gradient-to-b from-[#3d3d5c] to-[#2d2d4a] hover:from-[#4a4a6a] hover:to-[#3a3a5a]"}
            `}
          >
            {/* 3D立体外阴影 */}
            <div className={`
              absolute inset-0 rounded-2xl transition-all duration-200
              ${isActive(game.path)
                ? "shadow-[inset_0_-4px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_6px_0_#1a1a2e,0_8px_15px_rgba(0,0,0,0.4)]"
                : "shadow-[inset_0_-4px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_6px_0_#1e1e36,0_8px_15px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_0_-4px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_8px_0_#1e1e36,0_10px_20px_rgba(0,0,0,0.35)]"}
            `} />

            {/* 3D立体内阴影 */}
            <div className={`
              absolute inset-0 rounded-2xl transition-all duration-200
              ${isActive(game.path) ? "shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" : ""}
            `} />

            {/* 底部高光 */}
            <div className={`
              absolute bottom-0 left-[10%] right-[10%] h-[3px] rounded-full transition-all duration-200
              ${isActive(game.path)
                ? "bg-gradient-to-r from-transparent via-[#00ff88]/30 to-transparent opacity-100"
                : "bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100"}
            `} />

            {/* 激活指示器 */}
            {isActive(game.path) && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#00ff88] rounded-full shadow-[0_0_10px_#00ff88]" />
            )}

            <span className="text-[40px] max-sm:text-[32px] relative z-10 drop-shadow-lg">{game.icon}</span>
            <span className={`
              text-white text-sm max-sm:text-xs font-medium relative z-10 transition-all duration-200
              ${isActive(game.path)
                ? "text-[#00ff88] drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]"
                : "drop-shadow-md"}
            `}>
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