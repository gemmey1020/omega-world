import { ReactNode } from "react";

export default function MobileContainer({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-slate-900/10 flex justify-center items-center sm:py-8">
            <div className="w-full h-full min-h-screen sm:min-h-[auto] sm:h-[844px] sm:max-w-[480px] bg-background sm:rounded-[40px] shadow-2xl overflow-hidden relative sm:border sm:border-slate-800/50">
                {children}
            </div>
        </div>
    );
}
