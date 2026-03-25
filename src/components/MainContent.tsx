import { BettingBoard } from './BettingBoard';
import { CombinedLeaderboard } from './CombinedLeaderboard';
import { FullPlayoffBracket } from './FullPlayoffBracket';
import { LeaderboardTable } from './LeaderboardTable';

interface MainContentProps {
	activeTab: 'standings' | 'leaderboard' | 'bracket';
	session: any;
	currentLeagueId: string;
	locked: boolean;
	triggerSave: number;
	isUpdatingScores: boolean;
	handleGlobalSave: () => void;
	forceRefresh: () => void;
	refreshTrigger: number;
	currentUserName: string;
}

export function MainContent({
	activeTab,
	session,
	currentLeagueId,
	locked,
	triggerSave,
	isUpdatingScores,
	handleGlobalSave,
	forceRefresh,
	refreshTrigger,
	currentUserName
}: MainContentProps) {
	return (
		<div className="w-full min-h-[500px]">
			{activeTab === 'standings' && (
				<div className="flex flex-col items-center gap-8 w-full animate-fade-in pb-20">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl mx-auto">
						<BettingBoard conference="West" userId={session.user.id} leagueId={currentLeagueId} isLocked={locked} triggerSave={triggerSave} />
						<BettingBoard conference="East" userId={session.user.id} leagueId={currentLeagueId} isLocked={locked} triggerSave={triggerSave} />
					</div>
					{!locked && (
						<button onClick={handleGlobalSave} disabled={isUpdatingScores} className="mt-4 px-12 py-4 bg-green-600 rounded-xl font-black uppercase tracking-widest text-white shadow-xl hover:scale-105 transition-all">
							{isUpdatingScores ? 'Saving...' : 'Save All Predictions'}
						</button>
					)}
				</div>
			)}

			{activeTab === 'leaderboard' && (
				<div className="w-full max-w-full mx-auto animate-fade-in pb-20 px-2 lg:px-8">
					<LeaderboardTable 
						leagueId={currentLeagueId} 
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
							currentUserId={session.user.id} 
							refreshTrigger={refreshTrigger} 
							currentUserName={currentUserName}
						/>
					</div>
					<div className="w-full overflow-x-auto scrollbar-hide">
						<FullPlayoffBracket 
							userId={session.user.id} 
							leagueId={currentLeagueId} 
							isLocked={locked} 
							triggerSave={triggerSave}
							onSaveSuccess={forceRefresh}
						/>
					</div>
				</div>
			)}
		</div>
	);
}