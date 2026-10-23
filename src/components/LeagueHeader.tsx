import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ScoringRulesModal } from './ScoringRulesModal';
import { inviteUrl, shareInvite } from '../lib/invite';
import type { ScoringConfig } from '../lib/scoring';

interface LeagueHeaderProps {
	leagueDetails: {
		name: string;
		regular_season_lock_at: string | null;
		playoff_lock_at: string | null;
		scoring_config: ScoringConfig | null;
	};
	currentLeagueId: string;
	currentUserId: string;
	isLeagueAdmin: boolean;
	setIsSettingsOpen: (open: boolean) => void;
	onLeft: () => void;
}

export function LeagueHeader({ leagueDetails, currentLeagueId, currentUserId, isLeagueAdmin, setIsSettingsOpen, onLeft }: LeagueHeaderProps) {
	const [copySuccess, setCopySuccess] = useState(false);
	const [isRulesOpen, setIsRulesOpen] = useState(false);
	const [inviteStatus, setInviteStatus] = useState<'idle' | 'copied'>('idle');
	const [leaving, setLeaving] = useState(false);

	const leaveLeague = async () => {
		const confirmed = window.confirm(
			`Leave "${leagueDetails.name}"?\n\nYou'll disappear from this league's leaderboards. Your picks are kept, so if you rejoin with an invite link they come back.`
		);
		if (!confirmed) return;

		setLeaving(true);
		const { data, error } = await supabase
			.from('league_members')
			.delete()
			.eq('league_id', currentLeagueId)
			.eq('user_id', currentUserId)
			.select();
		setLeaving(false);

		if (error || !data?.length) {
			console.error('Leave failed:', error);
			alert('Could not leave the league. Please try again.');
			return;
		}
		onLeft();
	};

	const invite = async () => {
		try {
			const result = await shareInvite(currentLeagueId, leagueDetails.name);
			if (result === 'copied') {
				setInviteStatus('copied');
				setTimeout(() => setInviteStatus('idle'), 2000);
			}
		} catch (err) {
			console.error('Invite failed:', err);
			alert(`Could not share the invite. Send this link instead:\n${inviteUrl(currentLeagueId)}`);
		}
	};

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
					<button
						onClick={invite}
						className="flex-shrink-0 bg-orange-600 hover:bg-orange-500 px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider text-white transition-all active:scale-95"
					>
						{inviteStatus === 'copied' ? '✓ Link copied' : '🔗 Invite'}
					</button>
				</div>
			</div>
			<div className="flex flex-col items-end gap-3">
				{getWindowMessage()}
				<div className="flex flex-wrap justify-end gap-2">
					<button onClick={() => setIsRulesOpen(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-all border border-white/10 flex items-center gap-2 font-bold">
						📜 Rules
					</button>
					{isLeagueAdmin ? (
						<button onClick={() => setIsSettingsOpen(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-all border border-white/10 flex items-center gap-2 font-bold">
							⚙️ League Settings
						</button>
					) : (
						<button
							onClick={leaveLeague}
							disabled={leaving}
							className="bg-red-900/20 hover:bg-red-900/40 px-4 py-2 rounded-lg text-sm text-red-300 hover:text-red-200 transition-all border border-red-500/30 flex items-center gap-2 font-bold disabled:opacity-50"
						>
							{leaving ? 'Leaving...' : '🚪 Leave'}
						</button>
					)}
				</div>
			</div>
			{isRulesOpen && (
				<ScoringRulesModal
					config={leagueDetails.scoring_config}
					regularLockAt={leagueDetails.regular_season_lock_at}
					onClose={() => setIsRulesOpen(false)}
				/>
			)}
		</div>
	);
}