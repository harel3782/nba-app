import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';
import { Auth } from './components/Auth';
import { LeagueManager } from './components/LeagueManager';
import { ProfileModal } from './components/ProfileModal';
import { LeagueSettingsModal } from './components/LeagueSettingsModal';
import { Header } from './components/Header';
import { AdminPanel } from './components/AdminPanel';
import { LeagueHeader } from './components/LeagueHeader';
import { MainContent } from './components/MainContent';
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
	const [currentLeagueId, setCurrentLeagueId] = useState<string | null>(() => localStorage.getItem('nba_currentLeagueId') || null);
	const [activeTab, setActiveTab] = useState<'standings' | 'leaderboard' | 'bracket'>(() => (localStorage.getItem('nba_activeTab') as any) || 'standings');
	const [leagueDetails, setLeagueDetails] = useState<LeagueDetails | null>(null);
	const [displayName, setDisplayName] = useState('');
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [showAdminPanel, setShowAdminPanel] = useState(false);
	const [loading, setLoading] = useState(false);
	const [refreshTrigger, setRefreshTrigger] = useState(0);
	const [isUpdatingScores, setIsUpdatingScores] = useState(false);
	const [triggerSave, setTriggerSave] = useState(0);

	useEffect(() => {
		const handleFocus = () => setRefreshTrigger(prev => prev + 1);
		window.addEventListener('focus', handleFocus);
		return () => window.removeEventListener('focus', handleFocus);
	}, []);

	useEffect(() => {
		if (currentLeagueId) localStorage.setItem('nba_currentLeagueId', currentLeagueId);
		else localStorage.removeItem('nba_currentLeagueId');
	}, [currentLeagueId]);

	useEffect(() => { localStorage.setItem('nba_activeTab', activeTab); }, [activeTab]);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			if (session) updateLocalName(session);
		});
		const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			if (session) updateLocalName(session);
			else {
				setCurrentLeagueId(null);
				setLeagueDetails(null);
				setDisplayName('');
				setShowAdminPanel(false);
				localStorage.clear();
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
		if (currentLeagueId) fetchLeagueData(currentLeagueId);
		else setLeagueDetails(null);
	}, [currentLeagueId]);

	async function fetchLeagueData(leagueId: string) {
		setLoading(true);
		try {
			const { data, error } = await supabase.from('leagues').select('*').eq('id', leagueId).single();
			if (error) throw error;
			setLeagueDetails(data);
		} catch (error) {
			console.error(error);
			setCurrentLeagueId(null);
		} finally { setLoading(false); }
	}

	const handleGlobalSave = () => {
		setIsUpdatingScores(true);
		setTriggerSave(prev => prev + 1);
		setTimeout(() => {
			setRefreshTrigger(prev => prev + 1);
			setIsUpdatingScores(false);
		}, 1500);
	};

	const isLeagueLocked = () => {
		if (!leagueDetails) return false;
		const now = new Date();
		const openAt = leagueDetails.open_at ? new Date(leagueDetails.open_at) : null;
		const lockAt = leagueDetails.lock_at ? new Date(leagueDetails.lock_at) : null;
		return (openAt && now < openAt) || (lockAt && now > lockAt);
	};

	if (!session) return <Auth />;
	if (loading && !leagueDetails) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-4xl animate-spin">🏀</div>;

	const isSuperAdmin = session.user.email === import.meta.env.VITE_SUPER_ADMIN_EMAIL;
	const locked = isLeagueLocked();

	return (
		<div className="min-h-screen bg-gradient-to-br from-[#1D428A] to-[#002B5C] text-white font-sans selection:bg-orange-400 selection:text-black">
			<ProfileModal 
				isOpen={isProfileOpen} 
				onClose={() => setIsProfileOpen(false)} 
				currentName={displayName} 
				userId={session.user.id} 
				onUpdate={(n) => { 
					setDisplayName(n); 
					if (currentLeagueId) fetchLeagueData(currentLeagueId);
					setRefreshTrigger(p => p + 1);
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
					onUpdate={() => { fetchLeagueData(leagueDetails.id); setRefreshTrigger(p => p + 1); }} 
					onDelete={() => { setCurrentLeagueId(null); setLeagueDetails(null); setIsSettingsOpen(false); }} 
				/>
			)}
			
			<Header 
				displayName={displayName} 
				isSuperAdmin={isSuperAdmin} 
				showAdminPanel={showAdminPanel} 
				setShowAdminPanel={setShowAdminPanel} 
				setIsProfileOpen={setIsProfileOpen} 
				onLogout={() => supabase.auth.signOut()} 
			/>
			
			<main className="w-full max-w-full p-4 md:p-8 flex flex-col items-center">
				{isUpdatingScores && <div className="fixed top-24 z-[100] bg-yellow-500 text-black px-6 py-3 rounded-full font-black text-sm animate-bounce italic">⏳ Saving & Updating Scores...</div>}
				
				{isSuperAdmin && showAdminPanel && <AdminPanel />}
				
				<div className="w-full max-w-4xl mb-6">
					<LeagueManager 
						userId={session.user.id} 
						currentLeagueId={currentLeagueId} 
						onLeagueChange={(id) => setCurrentLeagueId(id)} 
						refreshTrigger={refreshTrigger} 
					/>
				</div>
				
				{currentLeagueId && leagueDetails ? (
					<div className="w-full max-w-full">
						<LeagueHeader 
							leagueDetails={leagueDetails} 
							currentLeagueId={currentLeagueId} 
							isLeagueAdmin={session.user.id === leagueDetails.created_by} 
							setIsSettingsOpen={setIsSettingsOpen} 
						/>
						
						<nav className="flex gap-2 mb-10 bg-black/40 p-1.5 rounded-2xl border border-white/5 w-fit mx-auto shadow-2xl backdrop-blur-xl">
							{['standings', 'leaderboard', 'bracket'].map((t) => (
								<button 
									key={t} 
									onClick={() => setActiveTab(t as any)} 
									className={`px-10 py-3 rounded-xl text-xs font-black uppercase transition-all ${activeTab === t ? 'bg-orange-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
								>
									{t === 'bracket' ? 'Playoffs' : t}
								</button>
							))}
						</nav>

						<MainContent 
							activeTab={activeTab}
							session={session}
							currentLeagueId={currentLeagueId}
							locked={!!locked}
							triggerSave={triggerSave}
							isUpdatingScores={isUpdatingScores}
							handleGlobalSave={handleGlobalSave}
							forceRefresh={() => setRefreshTrigger(p => p + 1)}
							refreshTrigger={refreshTrigger}
							currentUserName={displayName}
						/>
					</div>
				) : (
					<div className="text-center py-20 text-white/50 animate-pulse w-full">
						<h3 className="text-2xl font-bold italic tracking-tighter">👈 SELECT OR CREATE A LEAGUE TO START</h3>
					</div>
				)}
			</main>
		</div>
	);
}

export default App;