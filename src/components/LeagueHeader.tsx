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
		const openAt = leagueDetails.open_at ? new Date(leagueDetails.open_at) : null;
		const lockAt = leagueDetails.lock_at ? new Date(leagueDetails.lock_at) : null;

		if (openAt && now < openAt) return <span className="text-yellow-400 bg-yellow-900/30 px-3 py-1 rounded-full border border-yellow-500/30 text-xs font-bold">⏳ Opens: {openAt.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>;
		if (lockAt && now > lockAt) return <span className="text-red-400 bg-red-900/30 px-3 py-1 rounded-full border border-red-500/30 text-xs font-bold">🔒 Locked: {lockAt.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>;
		return <span className="text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30 text-xs font-bold">🟢 Window Open</span>;
	};

	return (
		<div className="w-full max-w-4xl mx-auto flex justify-between items-end mb-8 px-2 border-b border-white/10 pb-4">
			<div>
				<h2 className="text-4xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg flex items-center gap-4">
					{leagueDetails.name}
				</h2>
				<div className="flex items-center gap-4 mt-2">
					<div onClick={copyToClipboard} className="text-sm text-blue-300 cursor-pointer hover:text-white transition-colors flex items-center gap-1">
						<span>ID: {currentLeagueId}</span>
						{copySuccess ? <span className="text-green-400 font-bold">✓ Copied</span> : <span>📋</span>}
					</div>
					{getWindowMessage()}
				</div>
			</div>
			{isLeagueAdmin && (
				<button onClick={() => setIsSettingsOpen(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-all border border-white/10 flex items-center gap-2 font-bold">
					⚙️ League Settings
				</button>
			)}
		</div>
	);
}