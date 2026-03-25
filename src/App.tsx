import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { BettingBoard } from './components/BettingBoard';
import { Auth } from './components/Auth';
import { LeagueManager } from './components/LeagueManager';
import { ProfileModal } from './components/ProfileModal';
import { LeagueSettingsModal } from './components/LeagueSettingsModal';
import { AdminResultsControl } from './components/AdminResultsControl';
import { AdminStandingsMonitor } from './components/AdminStandingsMonitor';
import { LeaderboardTable } from './components/LeaderboardTable';
import { FullPlayoffBracket } from './components/FullPlayoffBracket';
import type { Session } from '@supabase/supabase-js';

interface LeagueDetails {
	id: string;
	name: string;
	created_by: string;
	open_at: string | null;
	lock_at: string | null;
	scoring_type: string;
}

function App() {
	const [session, setSession] = useState<Session | null>(null);

	// Initialize state from localStorage so it survives page refreshes
	const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(() => {
		return localStorage.getItem('nba_currentLeagueId') || null;
	});
	
	const [activeTab, setActiveTab] = useState<'standings' | 'leaderboard' | 'bracket'>(() => {
		return (localStorage.getItem('nba_activeTab') as 'standings' | 'leaderboard' | 'bracket') || 'standings';
	});

	const [leagueDetails, setLeagueDetails] = useState<LeagueDetails | null>(null);

	const [displayName, setDisplayName] = useState('');
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [showAdminPanel, setShowAdminPanel] = useState(false);

	const [loading, setLoading] = useState(false);
	const [copySuccess, setCopySuccess] = useState(false);

	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [isUpdatingScores, setIsUpdatingScores] = useState(false);
	const [triggerSave, setTriggerSave] = useState(0);

	// Refresh data automatically when the app regains focus (e.g., waking up from background)
	useEffect(() => {
		const handleFocus = () => {
			console.log("App regained focus, refreshing data...");
			setRefreshTrigger(prev => prev + 1);
		};

		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, []);

	// Sync state changes to localStorage
	useEffect(() => {
		if (currentLeagueId) {
			localStorage.setItem('nba_currentLeagueId', currentLeagueId);
		} else {
			localStorage.removeItem('nba_currentLeagueId');
		}
	}, [currentLeagueId]);

	useEffect(() => {
		localStorage.setItem('nba_activeTab', activeTab);
	}, [activeTab]);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			if (session) updateLocalName(session);
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			if (session) {
				updateLocalName(session);
			} else {
				// Clear everything on logout
				setCurrentLeagueId(null);
				setLeagueDetails(null);
				setDisplayName('');
				setShowAdminPanel(false);
				localStorage.removeItem('nba_currentLeagueId');
				localStorage.removeItem('nba_activeTab');
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
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentLeagueId]);

	async function fetchLeagueData(leagueId: string) {
		setLoading(true);
		try {
			const { data: leagueData, error: leagueError } = await supabase
				.from('leagues')
				.select('*')
				.eq('id', leagueId)
				.single();

			if (leagueError) throw leagueError;
			setLeagueDetails(leagueData);
		} catch (error) {
			console.error('Error fetching league data:', error);
			// If the league was deleted but ID is in memory, clear it
			setCurrentLeagueId(null);
		} finally {
			setLoading(false);
		}
	}

	const handleGlobalSave = () => {
		setIsUpdatingScores(true);
		setTriggerSave((prev) => prev + 1);

		setTimeout(() => {
			setRefreshTrigger((prev) => prev + 1);
			setIsUpdatingScores(false);
		}, 1500);
	};

	const copyToClipboard = () => {
		if (currentLeagueId) {
			navigator.clipboard.writeText(currentLeagueId);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		}
	};

	// Determine if the league is locked based on both open and lock dates
	const isLeagueLocked = () => {
		if (!leagueDetails) return false;
		const now = new Date();
		const openAt = leagueDetails.open_at ? new Date(leagueDetails.open_at) : null;
		const lockAt = leagueDetails.lock_at ? new Date(leagueDetails.lock_at) : null;
		
		if (openAt && now < openAt) return true; // Hasn't opened yet
		if (lockAt && now > lockAt) return true; // Already closed
		return false;
	};

	// Generate a user-friendly message for the guessing window
	const getWindowMessage = () => {
		if (!leagueDetails) return null;
		const now = new Date();
		const openAt = leagueDetails.open_at ? new Date(leagueDetails.open_at) : null;
		const lockAt = leagueDetails.lock_at ? new Date(leagueDetails.lock_at) : null;

		if (openAt && now < openAt) {
			return (
				<span className="text-yellow-400 bg-yellow-900/30 px-3 py-1 rounded-full border border-yellow-500/30 text-xs font-bold">
					⏳ Opens: {openAt.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
				</span>
			);
		}
		if (lockAt && now > lockAt) {
			return (
				<span className="text-red-400 bg-red-900/30 px-3 py-1 rounded-full border border-red-500/30 text-xs font-bold">
					🔒 Locked: {lockAt.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
				</span>
			);
		}
		if (lockAt && now <= lockAt) {
			return (
				<span className="text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30 text-xs font-bold animate-pulse">
					🟢 Open until {lockAt.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
				</span>
			);
		}
		return (
			<span className="text-green-400 bg-green-900/30 px-3 py-1 rounded-full border border-green-500/30 text-xs font-bold">
				🟢 Window Open
			</span>
		);
	};

	if (!session) return <Auth />;

	if (loading && !leagueDetails) {
		return (
			<div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
				<div className="animate-spin text-4xl">🏀</div>
			</div>
		);
	}

	const isLeagueAdmin = session.user.id === leagueDetails?.created_by;
	const isSuperAdmin = session.user.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL;
	const locked = isLeagueLocked();

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#1D428A] to-[#002B5C] text-white font-sans selection:bg-orange-400 selection:text-black">
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

			{leagueDetails && isSettingsOpen && (
				<LeagueSettingsModal
					isOpen={isSettingsOpen}
					onClose={() => setIsSettingsOpen(false)}
					leagueId={leagueDetails.id}
					currentName={leagueDetails.name}
					currentOpenDate={leagueDetails.open_at}
					currentLockDate={leagueDetails.lock_at}
					currentScoringType={leagueDetails.scoring_type}
					onUpdate={() => {
						fetchLeagueData(leagueDetails.id);
						setRefreshTrigger((prev) => prev + 1);
					}}
					onDelete={() => {
						setCurrentLeagueId(null);
						setLeagueDetails(null);
						setIsSettingsOpen(false);
						setRefreshTrigger((prev) => prev + 1);
					}}
				/>
			)}

			<header className="border-b border-white/10 bg-[#1D428A]/90 backdrop-blur-md sticky top-0 z-50 shadow-lg">
				<div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<img src="https://cdn.nba.com/logos/leagues/logo-nba.svg" alt="NBA" className="h-10 w-auto drop-shadow-md" />
						<h1 className="text-xl font-black tracking-tighter uppercase italic text-white hidden sm:block">
							Playoff <span className="text-orange-400">Predictor</span>
						</h1>
					</div>

					<div className="flex items-center gap-4">
						{isSuperAdmin && (
							<button
								onClick={() => setShowAdminPanel(!showAdminPanel)}
								className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border ${showAdminPanel ? 'bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse' : 'bg-black/30 text-gray-400 border-white/10 hover:bg-black/50 hover:text-white'}`}
							>
								{showAdminPanel ? 'Close Admin' : 'Admin Panel'}
							</button>
						)}

						<button onClick={() => setIsProfileOpen(true)} className="flex items-center gap-3 group hover:bg-white/5 p-1 rounded-full pr-3 transition-all border border-transparent hover:border-white/10">
							<div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-bold shadow-lg border border-white/10">
								{displayName.charAt(0).toUpperCase()}
							</div>
							<span className="text-sm font-bold text-white group-hover:text-orange-300 hidden sm:block">
								{displayName}
							</span>
						</button>

						<button onClick={() => supabase.auth.signOut()} className="bg-white/10 hover:bg-red-600/80 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all ml-2">
							Log Out
						</button>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col items-center">
				{isUpdatingScores && (
					<div className="fixed top-24 inset-x-0 mx-auto w-max z-[100] bg-yellow-500 text-black px-6 py-3 rounded-full font-black text-sm shadow-2xl flex items-center justify-center gap-2 animate-bounce">
						<span className="animate-spin">⏳</span>
						Saving & Updating Scores...
					</div>
				)}

				{isSuperAdmin && showAdminPanel && (
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
				)}

				<div className="w-full max-w-4xl mb-6 relative z-0">
					<LeagueManager 
						key={session.user.id} 
						userId={session.user.id} 
						currentLeagueId={currentLeagueId} 
						onLeagueChange={(id) => setCurrentLeagueId(id)} 
						refreshTrigger={refreshTrigger} 
					/>
				</div>

				{currentLeagueId && leagueDetails ? (
					<div className="w-full max-w-7xl">
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
								<button onClick={() => setIsSettingsOpen(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-all border border-white/10 flex items-center gap-2">
									⚙️ League Settings
								</button>
							)}
						</div>

						<nav className="flex gap-2 mb-10 bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit mx-auto shadow-2xl backdrop-blur-xl">
							<button 
								onClick={() => setActiveTab('standings')} 
								className={`px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
									activeTab === 'standings' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
								}`}
							>
								Standings
							</button>
							<button 
								onClick={() => setActiveTab('leaderboard')} 
								className={`px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
									activeTab === 'leaderboard' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
								}`}
							>
								Leaderboard
							</button>
							<button 
								onClick={() => setActiveTab('bracket')} 
								className={`px-10 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
									activeTab === 'bracket' ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'
								}`}
							>
								Playoffs
							</button>
						</nav>

						<div className="w-full min-h-[500px]">
							{activeTab === 'standings' && (
								<div className="flex flex-col items-center gap-8 w-full animate-fade-in pb-20">
									<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
										<div className="flex justify-center w-full">
											<BettingBoard conference="West" userId={session.user.id} leagueId={currentLeagueId} isLocked={locked} triggerSave={triggerSave} />
										</div>
										<div className="flex justify-center w-full">
											<BettingBoard conference="East" userId={session.user.id} leagueId={currentLeagueId} isLocked={locked} triggerSave={triggerSave} />
										</div>
									</div>

									{!locked && (
										<button
											onClick={handleGlobalSave}
											disabled={isUpdatingScores}
											className={`mt-4 px-12 py-4 rounded-xl font-black uppercase tracking-widest transition-all shadow-xl text-lg ${isUpdatingScores ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.4)] hover:scale-105'}`}
										>
											{isUpdatingScores ? 'Saving...' : 'Save All Predictions'}
										</button>
									)}
								</div>
							)}

							{activeTab === 'leaderboard' && (
								<div className="w-full mx-auto animate-fade-in pb-20">
									<LeaderboardTable leagueId={currentLeagueId} currentUserId={session.user.id} refreshTrigger={refreshTrigger} />
								</div>
							)}

							{activeTab === 'bracket' && (
								<div className="w-full animate-fade-in pb-20 overflow-x-auto">
									<FullPlayoffBracket 
										userId={session.user.id} 
										leagueId={currentLeagueId} 
										isLocked={locked} 
										triggerSave={triggerSave}
									/>
								</div>
							)}
						</div>
					</div>
				) : (
					<div className="text-center py-20 text-white/50 animate-pulse w-full">
						<h3 className="text-2xl font-bold">👈 Select or Create a League to Start</h3>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;