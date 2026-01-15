import type { ReactNode } from "react";

interface MobilePreviewFrameProps {
	children: ReactNode;
}

export function MobilePreviewFrame({ children }: MobilePreviewFrameProps) {
	return (
		<div className="relative">
			<div className="w-[375px] h-[812px] bg-black rounded-[3rem] p-3 shadow-xl">
				<div className="relative w-full h-full bg-background rounded-[2.4rem] overflow-hidden">
					<div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-black rounded-b-2xl z-10" />

					<div className="h-full overflow-auto">
						<div className="pt-8">
							{children}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
