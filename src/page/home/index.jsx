import { Link } from "react-router-dom";
import { config } from "@/router";

export default function Home() {
  return (
    <div className="flex flex-col justify-center min-h-full p-4 gap-20 md:gap-30 lg:gap-40">
      <h1
        className="font-['Press_Start_2P'] text-[26px] md:text-5xl lg:text-[65px] text-white text-center leading-tight tracking-widest"
        style={{
          textShadow:
            "2px 2px 0 #1a1a2e, 4px 4px 0 #fff, 6px 6px 10px rgba(0,0,0,0.5)",
        }}
      >
        CASUAL GAMES
      </h1>
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6 max-w-4xl mx-auto w-full px-2">
        {config.map((game) => (
          <Link
            key={game.path}
            to={`/game/${game.path}`}
            className="group relative aspect-square max-w-[100px] md:max-w-[130px] lg:max-w-[160px] mx-auto w-full"
          >
            {/* 卡片背景 */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-[#3d3d5c] to-[#2d2d4a] group-hover:from-[#2a2a3e] group-hover:to-[#1a1a2e] transition-all duration-200" />

            {/* 3D立体外阴影 */}
            <div className="absolute inset-0 rounded-2xl shadow-[inset_0_-4px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_6px_0_#1e1e36,0_8px_15px_rgba(0,0,0,0.3)] group-hover:shadow-[inset_0_-4px_0_rgba(0,0,0,0.3),inset_0_2px_0_rgba(255,255,255,0.1),0_6px_0_#1a1a2e,0_8px_15px_rgba(0,0,0,0.4)] transition-all duration-200" />

            {/* 3D立体内阴影 */}
            <div className="absolute inset-0 rounded-2xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]" />

            {/* 底部高光 - hover时显示绿色 */}
            <div
              className={`absolute bottom-0 left-[10%] right-[10%] h-[3px] rounded-full transition-all duration-200 bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-[#00ff88]/30 group-hover:opacity-100 opacity-0`}
            />

            {/* 激活指示器 - hover时显示 */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#00ff88] rounded-full shadow-[0_0_10px_#00ff88] opacity-0 group-hover:opacity-100 transition-all duration-200" />

            {/* 卡片内容 */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full p-2">
              <img
                src={game.icon}
                alt={game.name}
                className="w-12 h-12 lg:w-14 lg:h-14 object-contain"
              />
              <span className="text-white text-xs md:text-base lg:text-base font-medium mt-2 drop-shadow-md group-hover:text-[#00ff88] group-hover:drop-shadow-[0_0_8px_rgba(0,255,136,0.5)] transition-all duration-200">
                {game.name}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
