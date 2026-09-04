import { Radio, ShieldCheckIcon, ActivityIcon, FileSpreadsheet } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import { DecorIcon } from "./decor-icon";

type FeatureType = {
	title: string;
	icon: React.ReactNode;
	description: string;
};

export function FeatureSection() {
	return (
		<div className="relative border border-emerald-100/50 bg-emerald-50/5 p-6 rounded-3xl mx-auto max-w-5xl dark:border-zinc-800/50 dark:bg-zinc-950/20">
			{/* Corner Crosshairs */}
			<DecorIcon position="top-left" className="text-emerald-500/50 dark:text-emerald-400/40" />
			<DecorIcon position="top-right" className="text-emerald-500/50 dark:text-emerald-400/40" />
			<DecorIcon position="bottom-left" className="text-emerald-500/50 dark:text-emerald-400/40" />
			<DecorIcon position="bottom-right" className="text-emerald-500/50 dark:text-emerald-400/40" />

			<div className="grid grid-cols-2 gap-4 py-4 md:grid-cols-4">
				{features.map((feature, index) => (
					<div
						className={cn(
							"relative flex flex-col items-center justify-center p-2",
							"after:absolute after:inset-y-0 after:right-0 after:h-full after:w-px after:bg-gradient-to-b after:from-transparent after:via-neutral-200 after:to-transparent dark:after:via-zinc-800/40",
							"[&_svg]:size-6 [&_svg]:text-emerald-600 dark:[&_svg]:text-emerald-400",
							{
								"after:hidden": index === features.length - 1,
								"after:hidden after:md:block": index === 1,
							}
						)}
						key={feature.title}
					>
						{feature.icon}
						<h3 className="mt-4 text-center font-bold text-xs md:text-sm lg:text-base text-neutral-900 dark:text-zinc-100">
							{feature.title}
						</h3>
						<p className="mt-1 text-center text-[10px] text-neutral-500 md:text-xs dark:text-zinc-400">
							{feature.description}
						</p>
					</div>
				))}
			</div>
		</div>
	);
}

const features: FeatureType[] = [
	{
		title: "Instant Tap-in",
		icon: <Radio />,
		description: "RFID scan recorded in under 200ms.",
	},
	{
		title: "Secure by Design",
		icon: <ShieldCheckIcon />,
		description: "Role-based authentication & encryption.",
	},
	{
		title: "Real-time Sync",
		icon: <ActivityIcon />,
		description: "Immediate streams to teacher dashboards.",
	},
	{
		title: "Auto-Generated SF2",
		icon: <FileSpreadsheet />,
		description: "DepEd School Form 2 reports in seconds.",
	},
];
