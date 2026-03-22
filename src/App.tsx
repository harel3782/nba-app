import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { BettingBoard } from './BettingBoard';
import { Auth } from './Auth';
import { LeagueManager } from './LeagueManager';
import { ProfileModal } from './ProfileModal';
import { LeagueSettingsModal } from './LeagueSettingsModal';
import { FullPlayoffBracket } from './FullPlayoffBracket';
import { AdminResultsControl } from './AdminResultsControl';
import { AdminStandingsMonitor } from './AdminStandingsMonitor';
import { LeaderboardTable } from './LeaderboardTable';
import type { Session } from '@supabase/supabase-js';

interface LeagueDetails {
	id: string;
	name: string;
	created_by: string;
	lock_at: string | null;
	scoring_type: string;
}

function App() {
	const [session, setSession] = useState<Session | null>(null);
	const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(null);
	const [leagueDetails, setLeagueDetails] = useState<LeagueDetails | null>(null);
	const [displayName, setDisplayName] = useState('');
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [showAdminPanel, setShowAdminPanel] = useState(false);
	const [activeTab, setActiveTab] = useState<'standings' | 'playoffs'>('standings');
	
	// FIX: Removed the 'loading' state variable that caused the build error (TS6133)
	const [copySuccess, setCopySuccess] = useState(false);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [isUpdatingScores, setIsUpdatingScores] = useState(false);

	// Auth Initialization
	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			if (session) updateLocalName(session);
		});

		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			if (session) {
				updateLocalName(session);
			} else {
				setCurrentLeagueId(null);
				setLeagueDetails(null);
				setDisplayName('');
				setShowAdminPanel(false);
			}
		});
		return () => subscription.unsubscribe();
	}, []);

	const updateLocalName = (session: Session) => {
		const metaName = session.user.user_metadata?.display_name;
		const emailName = session.user.email?.split('@')[0] || 'User';
		setDisplayName(metaName || emailName);
	};

	useEffect(() => {
		if (currentLeagueId) {
			fetchLeagueData(currentLeagueId);
		} else {
			setLeagueDetails(null);
		}
	}, [currentLeagueId]);

	async function fetchLeagueData(leagueId: string) {
		// FIX: Removed 'setLoading(true)'
		try {
			const { data, error } = await supabase
				.from('leagues')
				.select('*')
				.eq('id', leagueId)
				.single();
			if (error) throw error;
			setLeagueDetails(data);
		} catch (err) {
			console.error('Error fetching league:', err);
		}
		// FIX: Removed 'setLoading(false)'
	}

	const handleSaveSuccess = () => {
		setIsUpdatingScores(true);
		setTimeout(() => {
			setRefreshTrigger((prev) => prev + 1);
			setIsUpdatingScores(false);
		}, 1000);
	};

	const handleDeleteLeague = () => {
		setCurrentLeagueId(null);
		setLeagueDetails(null);
		setRefreshTrigger((prev) => prev + 1);
	};

	const copyToClipboard = () => {
		if (currentLeagueId) {
			navigator.clipboard.writeText(currentLeagueId);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		}
	};

	if (!session) return <Auth />;

	const isLeagueAdmin = session.user.id === leagueDetails?.created_by;
	
	// FIX: Accessing the Super Admin Email directly from environment variables
	const isSuperAdmin = session.user.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL;
	
	const locked = leagueDetails?.lock_at ? new Date() > new Date(leagueDetails.lock_at) : false;

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#1D428A] to-[#002B5C] text-white font-sans selection:bg-orange-400">
			<ProfileModal
				isOpen={isProfileOpen}
				onClose={() => setIsProfileOpen(false)}
				currentName={displayName}
				userId={session.user.id}
				onUpdate={(newName) => {
					setDisplayName(newName);
					if (currentLeagueId) fetchLeagueData(currentLeagueId);
				}}
			/>

			{leagueDetails && (
				<LeagueSettingsModal
					key={leagueDetails.id}
					isOpen={isSettingsOpen}
					onClose={() => setIsSettingsOpen(false)}
					leagueId={leagueDetails.id}
					currentName={leagueDetails.name}
					currentLockDate={leagueDetails.lock_at}
					currentScoringType={leagueDetails.scoring_type}
					onUpdate={() => {
						fetchLeagueData(leagueDetails.id);
						handleSaveSuccess();
					}}
					onDelete={handleDeleteLeague}
				/>
			)}

			<header className="border-b border-white/10 bg-[#1D428A]/90 backdrop-blur-md sticky top-0 z-50 shadow-lg">
				<div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<img src="/logo.png" alt="NBA" className="h-10 w-auto" />
						<h1 className="text-xl font-black uppercase italic hidden sm:block">
							Playoff <span className="text-orange-400">Predictor</span>
						</h1>
					</div>

					<div className="flex items-center gap-4">
						{isSuperAdmin && (
							<button 
								onClick={() => setShowAdminPanel(!showAdminPanel)}
								className={`px-3 py-1.5 rounded-lg font-bold text-[10px] border transition-all ${showAdminPanel ? 'bg-red-600 border-red-400' : 'bg-black/30 border-white/10'}`}
							>
								{showAdminPanel ? 'Close Admin' : 'Admin Panel'}
							</button>
						)}
						<button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-3 p-1 pr-3 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10">
							<div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-bold">
								{displayName.charAt(0).toUpperCase()}
							</div>
							<span className="text-sm font-bold hidden sm:block">{displayName}</span>
						</button>
						<button onClick={() => supabase.auth.signOut()} className="bg-white/10 hover:bg-red-600 text-xs font-bold py-2 px-3 rounded-lg">
							Log Out
						</button>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col items-center">
				{isUpdatingScores && (
					<div className="fixed top-20 left-1/2 -translate-x-1/2 bg-yellow-500 text-black px-4 py-2 rounded-full text-xs font-bold z-50 animate-bounce">
						⏳ Updating Scores...
					</div>
				)}

				{isSuperAdmin && showAdminPanel && (
					<div className="w-full max-w-4xl mb-8 border-4 border-red-600 bg-gray-900 rounded-xl overflow-hidden p-6">
						<AdminStandingsMonitor />
						<AdminResultsControl />
					</div>
				)}

				<div className="w-full mb-6">
					<LeagueManager
						key={`${session.user.id}-${refreshTrigger}`}
						userId={session.user.id}
						currentLeagueId={currentLeagueId}
						onLeagueChange={(id) => setCurrentLeagueId(id)}
					/>
				</div>

				{currentLeagueId && leagueDetails ? (
					<>
						<div className="w-full max-w-4xl flex justify-between items-end mb-4">
							<div onClick={copyToClipboard} className="cursor-pointer">
								<h2 className="text-4xl font-black uppercase italic">{leagueDetails.name}</h2>
								<div className="text-sm text-blue-300 flex items-center gap-2">
									<span>ID: {currentLeagueId}</span>
									{copySuccess && <span className="text-green-400">✓ Copied</span>}
								</div>
							</div>
							{isLeagueAdmin && (
								<button onClick={() => setIsSettingsOpen(true)} className="bg-white/10 px-4 py-2 rounded-lg text-sm border border-white/10">
									⚙️ League Settings
								</button>
							)}
						</div>

						<LeaderboardTable leagueId={currentLeagueId} currentUserId={session.user.id} refreshTrigger={refreshTrigger} />

						<div className="flex justify-center mb-6 gap-4 mt-8">
							<button onClick={() => setActiveTab('standings')} className={`px-8 py-2 rounded-full font-bold ${activeTab === 'standings' ? 'bg-white text-blue-900' : 'bg-white/10'}`}>
								Standings
							</button>
							<button onClick={() => setActiveTab('playoffs')} className={`px-8 py-2 rounded-full font-bold ${activeTab === 'playoffs' ? 'bg-orange-500 text-white' : 'bg-white/10'}`}>
								Playoffs
							</button>
						</div>

						{activeTab === 'standings' ? (
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl">
								<BettingBoard conference="West" userId={session.user.id} leagueId={currentLeagueId} isLocked={locked} onSave={handleSaveSuccess} />
								<BettingBoard conference="East" userId={session.user.id} leagueId={currentLeagueId} isLocked={locked} onSave={handleSaveSuccess} />
							</div>
						) : (
							<FullPlayoffBracket userId={session.user.id} leagueId={currentLeagueId} isLocked={locked} onSave={handleSaveSuccess} />
						)}
					</>
				) : (
					<div className="text-center py-20 text-white/50">
						<h3 className="text-2xl font-bold">👈 Select or Create a League to Start</h3>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;