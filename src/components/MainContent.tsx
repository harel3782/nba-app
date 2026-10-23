import { useRef, useState } from 'react';
import { BettingBoard, type BettingBoardHandle } from './BettingBoard';
import { CombinedLeaderboard } from './CombinedLeaderboard';
import { FullPlayoffBracket } from './FullPlayoffBracket';
import { LeaderboardTable } from './LeaderboardTable';
import { LockCountdown } from './LockCountdown';
import type { ScoringConfig } from '../lib/scoring';

interface MainContentProps {
	activeTab: 'standings' | 'leaderboard' | 'bracket';
	session: any;
	currentLeagueId: string;
	leagueName: string;
	scoringConfig: ScoringConfig | null;
	regularLocked: boolean;
	playoffLocked: boolean;
	regularLockAt: string | null;
	playoffLockAt: string | null;
	onLockExpire: () => void;
	forceRefresh: () => void;
	refreshTrigger: number;
	currentUserName: string;
}

export function MainContent({
	activeTab,
	session,
	currentLeagueId,
	leagueName,
	scoringConfig,
	regularLocked,
	playoffLocked,
	regularLockAt,
	playoffLockAt,
	onLockExpire,
	forceRefresh,
	refreshTrigger,
	currentUserName
}: MainContentProps) {
	const westRef = useRef<BettingBoardHandle>(null);
	const eastRef = useRef<BettingBoardHandle>(null);
	const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');

	async function saveAllPredictions() {
		setSaveState('saving');
		// Sequential on purpose: each board alerts on its own failure, and East is skipped if West failed.
		const ok = (await westRef.current?.save()) === true && (await eastRef.current?.save()) === true;
		if (!ok) {
			setSaveState('idle');
			return;
		}
		forceRefresh();
		setSaveState('saved');
		setTimeout(() => setSaveState(s => (s === 'saved' ? 'idle' : s)), 2500);
	}

	return (
		<div className="w-full min-h-[500px]">
			{saveState !== 'idle' && (
				<div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full font-black text-sm italic shadow-xl ${saveState === 'saving' ? 'bg-yellow-500 text-black animate-pulse' : 'bg-green-500 text-black'}`}>
					{saveState === 'saving' ? '⏳ Saving predictions...' : '✅ Predictions saved'}
				</div>
			)}

			{activeTab === 'standings' && (
				<div className="flex flex-col items-center gap-8 w-full animate-fade-in pb-20">
					<LockCountdown lockAt={regularLockAt} label="Regular season picks" onExpire={onLockExpire} />
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl mx-auto">
						<BettingBoard ref={westRef} conference="West" userId={session.user.id} leagueId={currentLeagueId} isLocked={regularLocked} />
						<BettingBoard ref={eastRef} conference="East" userId={session.user.id} leagueId={currentLeagueId} isLocked={regularLocked} />
					</div>
					{!regularLocked && (
						<button onClick={saveAllPredictions} disabled={saveState === 'saving'} className="mt-4 px-12 py-4 bg-green-600 rounded-xl font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 transition-all disabled:opacity-60 disabled:hover:scale-100">
							{saveState === 'saving' ? 'Saving...' : 'Save All Predictions'}
						</button>
					)}
				</div>
			)}

			{activeTab === 'leaderboard' && (
				<div className="w-full max-w-full mx-auto animate-fade-in pb-20 px-2 lg:px-8">
					<LeaderboardTable
						leagueId={currentLeagueId}
						leagueName={leagueName}
						currentUserId={session.user.id}
						refreshTrigger={refreshTrigger}
						currentUserName={currentUserName}
					/>
				</div>
			)}

			{activeTab === 'bracket' && (
				<div className="w-full animate-fade-in pb-20 space-y-12">
					<div className="max-w-4xl mx-auto px-4">
						<CombinedLeaderboard
							leagueId={currentLeagueId}
							leagueName={leagueName}
							scoringConfig={scoringConfig}
							currentUserId={session.user.id}
							refreshTrigger={refreshTrigger}
							currentUserName={currentUserName}
						/>
					</div>
					<LockCountdown lockAt={playoffLockAt} label="Playoff picks" onExpire={onLockExpire} />
					<div className="w-full overflow-x-auto scrollbar-hide">
						<FullPlayoffBracket
							userId={session.user.id}
							leagueId={currentLeagueId}
							isLocked={playoffLocked}
							onSaveSuccess={forceRefresh}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
