import { useLocation, Outlet, Link } from "react-router-dom";
import { config } from "@/router";

export default function Layout() {
  const location = useLocation();

  const isActive = (path) => location.pathname === `/game/${path}`;

  return (
    <div className="flex flex-col h-full overflow-auto">
      {/* 顶部导航栏 */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-[#2a2a3e] to-[#1a1a2e] border-b border-white/10">
        <Link
          to="/"
          className="flex items-center gap-1 text-white hover:text-[#00ff88] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-xs font-medium">首页</span>
        </Link>
        <span className="text-white text-sm font-medium">
          {config.find((g) => isActive(g.path))?.name || "游戏"}
        </span>
        <div className="w-10" />
      </div>

      {/* 游戏内容区域 */}
      <div className="flex-1 flex justify-center items-start p-2 pt-0">
        <Outlet />
      </div>
    </div>
  );
}
