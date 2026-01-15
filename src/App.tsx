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
// import { StatusBar, Style } from '@capacitor/status-bar';
// import { Capacitor } from '@capacitor/core';  

// --- Super Admin Configuration ---
const SUPER_ADMIN_EMAIL = "harel.mashiah@gmail.com"; 

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
	const [loading, setLoading] = useState(false);
	const [copySuccess, setCopySuccess] = useState(false);

	// --- Refresh Trigger State ---
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	// New state to show global saving indicator (optional)
	const [isUpdatingScores, setIsUpdatingScores] = useState(false);

	// Auth Effect
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
			console.error("Error fetching league data:", error);
		} finally {
			setLoading(false);
		}
	}

	// --- FIX: Added Delay ---
	const handleSaveSuccess = () => {
		setIsUpdatingScores(true); // Show some visual feedback if you want
		
		// Wait 1 second (1000ms) for the DB Trigger to finish calculating
		setTimeout(() => {
			setRefreshTrigger(prev => prev + 1);
			setIsUpdatingScores(false);
		}, 1000); 
	};

	const copyToClipboard = () => {
		if (currentLeagueId) {
			navigator.clipboard.writeText(currentLeagueId);
			setCopySuccess(true);
			setTimeout(() => setCopySuccess(false), 2000);
		}
	};

	const isLeagueLocked = () => {
		if (!leagueDetails?.lock_at) return false; 
		return new Date() > new Date(leagueDetails.lock_at);
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
	const isSuperAdmin = session.user.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
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

			{leagueDetails && (
				<LeagueSettingsModal 
						isOpen={isSettingsOpen}
						onClose={() => setIsSettingsOpen(false)}
						leagueId={leagueDetails.id}
						currentName={leagueDetails.name}
						currentLockDate={leagueDetails.lock_at}
						currentScoringType={leagueDetails.scoring_type}
						onUpdate={() => fetchLeagueData(leagueDetails.id)}
				/>
			)}

			{/* Header */}
			<header className="border-b border-white/10 bg-[#1D428A]/90 backdrop-blur-md sticky top-0 z-50 shadow-lg">
				<div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
					
					<div className="flex items-center gap-3">
						<img src="https://cdn.nba.com/logos/leagues/logo-nba.svg" alt="NBA" className="h-10 w-auto drop-shadow-md"/>
						<h1 className="text-xl font-black tracking-tighter uppercase italic text-white hidden sm:block">
							Playoff <span className="text-orange-400">Predictor</span>
						</h1>
					</div>

					<div className="flex items-center gap-4">
						
						{isSuperAdmin && (
							<button
								onClick={() => setShowAdminPanel(!showAdminPanel)}
								className={`
									hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all border
									${showAdminPanel 
										? 'bg-red-600 text-white border-red-400 shadow-[0_0_15px_rgba(220,38,38,0.5)] animate-pulse' 
										: 'bg-black/30 text-gray-400 border-white/10 hover:bg-black/50 hover:text-white'}
								`}
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
						
						<button 
								onClick={() => supabase.auth.signOut()} 
								className="bg-white/10 hover:bg-red-600/80 text-white text-xs font-bold py-2 px-3 rounded-lg transition-all ml-2"
						>
							 Log Out
						</button>
					</div>
				</div>
			</header>

			<main className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col items-center">

				{/* Global Updating Indicator */}
				{isUpdatingScores && (
					<div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-full text-xs font-bold shadow-xl z-50 animate-bounce flex items-center gap-2">
						<span className="animate-spin">⏳</span> Updating Scores...
					</div>
				)}

				{isSuperAdmin && showAdminPanel && (
						<div className="w-full max-w-4xl mb-8 border-4 border-red-600 bg-gray-900 rounded-xl overflow-hidden shadow-2xl z-50 relative animate-fade-in">
								<div className="bg-red-600 text-white text-center font-bold text-xs py-2 uppercase tracking-[0.2em]">
									 ⚠️ Super Admin Control Panel ⚠️
								</div>
								
								<div className="p-6 flex flex-col gap-10">
									 <section>
											<div className="mb-4 border-b border-gray-700 pb-2 flex justify-between items-center">
												<h2 className="text-xl font-bold text-white">1. Live Standings Monitor</h2>
												<span className="text-[10px] bg-green-900 text-green-300 px-2 py-1 rounded border border-green-700 font-bold tracking-wider">
													 ● AUTO-SYNC ACTIVE
												</span>
											</div>
											<p className="text-gray-400 text-xs mb-4">Verifying data from your external script:</p>
											<AdminStandingsMonitor />
									 </section>

									 <section>
											<div className="mb-4 border-b border-gray-700 pb-2">
												<h2 className="text-xl font-bold text-white">2. Playoff Results Controls</h2>
											</div>
											<p className="text-gray-400 text-xs mb-4">Click to mark official winners:</p>
											<AdminResultsControl />
									 </section>
								</div>
						</div>
				)}

				<div className="w-full mb-6 relative z-0">
					 <LeagueManager 
						key={session.user.id}
						userId={session.user.id} 
						currentLeagueId={currentLeagueId} 
						onLeagueChange={(id) => setCurrentLeagueId(id)} 
					/>
				</div>

				{currentLeagueId && leagueDetails ? (
					<>
						<div className="w-full max-w-4xl flex justify-between items-end mb-4 px-2">
								<div>
										<h2 className="text-4xl font-black text-white uppercase italic tracking-tighter drop-shadow-lg">
												{leagueDetails.name}
										</h2>
										<div 
												onClick={copyToClipboard}
												className="text-sm text-blue-300 cursor-pointer hover:text-white transition-colors flex items-center gap-2 mt-1"
										>
												<span>ID: {currentLeagueId}</span>
												{copySuccess ? <span className="text-green-400 font-bold">✓ Copied</span> : <span>📋</span>}
										</div>
								</div>
								
								{isLeagueAdmin && (
										<button onClick={() => setIsSettingsOpen(true)} className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm text-gray-300 hover:text-white transition-all border border-white/10 flex items-center gap-2">
												⚙️ League Settings
										</button>
								)}
						</div>

						<LeaderboardTable 
								leagueId={currentLeagueId} 
								currentUserId={session.user.id} 
								refreshTrigger={refreshTrigger}
						/>

						<div className="flex justify-center mb-6 gap-4 mt-8">
								<button 
										onClick={() => setActiveTab('standings')} 
										className={`px-8 py-2 rounded-full font-bold uppercase tracking-wider transition-all ${activeTab === 'standings' ? 'bg-white text-blue-900 scale-105 shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}
								>
										Standings
								</button>
								<button 
										onClick={() => setActiveTab('playoffs')} 
										className={`px-8 py-2 rounded-full font-bold uppercase tracking-wider transition-all ${activeTab === 'playoffs' ? 'bg-orange-500 text-white scale-105 shadow-lg' : 'bg-white/10 hover:bg-white/20'}`}
								>
										Playoffs
								</button>
						</div>

						{activeTab === 'standings' ? (
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-7xl animate-fade-in">
										<div className="flex justify-center">
											<BettingBoard 
												conference="West" 
												userId={session.user.id} 
												leagueId={currentLeagueId} 
												isLocked={locked} 
												onSave={handleSaveSuccess}
											/>
										</div>
										<div className="flex justify-center">
											<BettingBoard 
												conference="East" 
												userId={session.user.id} 
												leagueId={currentLeagueId} 
												isLocked={locked} 
												onSave={handleSaveSuccess}
											/>
										</div>
								</div>
						) : (
								<FullPlayoffBracket 
									userId={session.user.id} 
									leagueId={currentLeagueId} 
									isLocked={locked} 
									onSave={handleSaveSuccess}
								/>
						)}
					</>
				) : (
						<div className="text-center py-20 text-white/50 animate-pulse">
							<h3 className="text-2xl font-bold">👈 Select or Create a League to Start</h3>
						</div>
				)}
			</main>
		</div>
	);
}

export default App;