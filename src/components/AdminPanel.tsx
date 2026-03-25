import { AdminStandingsMonitor } from './AdminStandingsMonitor';
import { AdminResultsControl } from './AdminResultsControl';

export function AdminPanel() {
	return (
		<div className="w-full max-w-4xl mb-8 border-4 border-red-600 bg-gray-900 rounded-xl overflow-hidden shadow-2xl z-50 relative animate-fade-in">
			<div className="bg-red-600 text-white text-center font-bold text-xs py-2 uppercase tracking-[0.2em]">⚠️ Super Admin Control Panel ⚠️</div>
			<div className="p-6 flex flex-col gap-10">
				<section>
					<div className="mb-4 border-b border-gray-700 pb-2 flex justify-between items-center">
						<h2 className="text-xl font-bold text-white">1. Live Standings Monitor</h2>
						<span className="text-[10px] bg-green-900 text-green-300 px-2 py-1 rounded border border-green-700 font-bold tracking-wider">● AUTO-SYNC ACTIVE</span>
					</div>
					<AdminStandingsMonitor />
				</section>
				<section>
					<div className="mb-4 border-b border-gray-700 pb-2">
						<h2 className="text-xl font-bold text-white">2. Playoff Results Controls</h2>
					</div>
					<AdminResultsControl />
				</section>
			</div>
		</div>
	);
}