import { useState } from 'react';

interface LeagueHeaderProps {
	leagueDetails: any;
	currentLeagueId: string;
	isLeagueAdmin: boolean;
	setIsSettingsOpen: (open: boolean) => void;
}

export function LeagueHeader({ leagueDetails, currentLeagueId, isLeagueAdmin, setIsSettingsOpen }: LeagueHeaderProps) {
	const [copySuccess, setCopySuccess] = useState(false);

	const copyToClipboard = () => {
		navigator.clipboard.writeText(currentLeagueId);
		setCopySuccess(true);
		setTimeout(() => setCopySuccess(false), 2000);
	};

	const getWindowMessage = () => {
		const now = new Date();
		const regLock = leagueDetails.regular_season_lock_at ? new Date(leagueDetails.regular_season_lock_at) : null;
		const playLock = leagueDetails.playoff_lock_at ? new Date(leagueDetails.playoff_lock_at) : null;

		const isRegLocked = regLock && now > regLock;
		const isPlayLocked = playLock && now > playLock;

		if (isRegLocked && isPlayLocked) {
			return <span className="text-red-400 bg-red-900/30 px-3 py-1 rounded-full border border-red-500/30 text-[10px] font-bold">🔒 ALL PREDICTIONS LOCKED</span>;
		}

		return (
			<div className="flex flex-col gap-1.5 items-end">
				{isRegLocked ? (
					<span className="text-red-400 bg-red-900/30 px-2.5 py-0.5 rounded text-[10px] font-bold border border-red-500/30">🔒 REGULAR SEASON: LOCKED</span>
				) : (
					regLock && <span className="text-yellow-400 bg-yellow-900/30 px-2.5 py-0.5 rounded text-[10px] font-bold border border-yellow-500/30">⏳ REGULAR LOCKS: {regLock.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
				)}
				
				{isPlayLocked ? (
					<span className="text-red-400 bg-red-900/30 px-2.5 py-0.5 rounded text-[10px] font-bold border border-red-500/30">🔒 PLAYOFFS: LOCKED</span>
				) : (
					playLock && <span className="text-yellow-400 bg-yellow-900/30 px-2.5 py-0.5 rounded text-[10px] font-bold border border-yellow-500/30">⏳ PLAYOFFS LOCK: {playLock.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
				)}
			</div>
		);
	};

	return (
		<div className="w-full max-w-4xl mx-auto flex flex-wrap justify-between items-start gap-3 mb-8 px-2 border-b border-white/10 pb-4">
			<div className="min-w-0">
				<h2 className="text-2xl sm:text-4xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg">
					{leagueDetails.name}
				</h2>
				<div className="flex items-center gap-2 mt-2 min-w-0">
					<div onClick={copyToClipboard} className="text-xs sm:text-sm text-blue-300 cursor-pointer hover:text-white transition-colors flex items-center gap-1 min-w-0">
						<span className="truncate max-w-[150px] sm:max-w-none">ID: {currentLeagueId}</span>
						{copySuccess ? <span className="text-green-400 font-bold whitespace-nowrap">✓ Copied</span> : <span>📋</span>}
					</div>
				</div>
			</div>
			<div className="flex flex-col items-end gap-3">
				{getWindowMessage()}
				{isLeagueAdmin && (
					<button onClick={() => setIsSettingsOpen(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-all border border-white/10 flex items-center gap-2 font-bold">
						⚙️ League Settings
					</button>
				)}
			</div>
		</div>
	);
}