import { memo, type FC } from "react";
import { Loader2 } from "lucide-react";

export const RunningOverlay: FC = memo(() => (
  <div className="absolute inset-0 z-30 flex items-center justify-center bg-card/60 rounded-lg animate-in fade-in duration-300">
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse" />
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin relative z-10" />
      </div>
      <span className="text-mini font-black uppercase tracking-widest text-orange-500 drop-shadow-md">
        Running...
      </span>
    </div>
  </div>
));
