import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface League {
	id: string;
	name: string;
}

interface Props {
	userId: string;
	currentLeagueId: string | null;
	onLeagueChange: (leagueId: string, leagueName?: string) => void;
	refreshTrigger?: number;
}

export function LeagueManager({ userId, currentLeagueId, onLeagueChange, refreshTrigger }: Props) {
	const [myLeagues, setMyLeagues] = useState<League[]>([]);
	const [newLeagueName, setNewLeagueName] = useState('');
	const [joinCode, setJoinCode] = useState('');
	const [activeTab, setActiveTab] = useState<'list' | 'create' | 'join'>('list');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		fetchMyLeagues();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, refreshTrigger]);

	async function fetchMyLeagues() {
		const { data: membershipData } = await supabase
			.from('league_members')
			.select('league_id')
			.eq('user_id', userId);

		if (membershipData && membershipData.length > 0) {
			const leagueIds = membershipData.map((m) => m.league_id);

			const { data: leaguesData } = await supabase
				.from('leagues')
				.select('*')
				.in('id', leagueIds);

			if (leaguesData) {
				setMyLeagues(leaguesData);
				// If no league is selected, select the first one
				if (!currentLeagueId && leaguesData.length > 0) {
					onLeagueChange(leaguesData[0].id, leaguesData[0].name);
				}
			}
		}
	}

	async function createLeague() {
		if (!newLeagueName) return;
		setIsSubmitting(true);

		try {
			const { data: league, error } = await supabase
				.from('leagues')
				.insert({ name: newLeagueName, created_by: userId })
				.select()
				.single();

			if (error) {
				console.error(error);
				alert('Error creating league');
				return;
			}

			await supabase.from('league_members').insert({
				league_id: league.id,
				user_id: userId,
			});

			await fetchMyLeagues();
			onLeagueChange(league.id, league.name);
			setActiveTab('list');
			setNewLeagueName('');
		} finally {
			setIsSubmitting(false);
		}
	}

	async function joinLeague() {
		if (!joinCode) return;
		setIsSubmitting(true);

		try {
			const { data: league, error: leagueError } = await supabase
				.from('leagues')
				.select('name')
				.eq('id', joinCode)
				.single();

			if (leagueError || !league) {
				alert('League not found check code.');
				return;
			}

			const { error } = await supabase.from('league_members').insert({
				league_id: joinCode,
				user_id: userId,
			});

			if (error && error.code !== '23505') {
				alert('Could not join league.');
				return;
			}

			await fetchMyLeagues();
			onLeagueChange(joinCode, league.name);
			setActiveTab('list');
			setJoinCode('');
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 mb-8 w-full max-w-4xl shadow-xl">
			<div className="flex gap-2 border-b border-white/10 pb-4 mb-4 overflow-x-auto">
				<button
					onClick={() => setActiveTab('list')}
					className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'list' ? 'bg-white text-[#1D428A]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
				>
					My Leagues
				</button>
				<button
					onClick={() => setActiveTab('create')}
					className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'create' ? 'bg-white text-[#1D428A]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
				>
					Create New
				</button>
				<button
					onClick={() => setActiveTab('join')}
					className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === 'join' ? 'bg-white text-[#1D428A]' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
				>
					Join via Code
				</button>
			</div>

			{activeTab === 'list' && (
				<div className="space-y-3">
					{myLeagues.length === 0 ? (
						<p className="text-white/60 text-center py-2">
							You are not in any leagues yet.
						</p>
					) : null}
					<div className="flex flex-wrap gap-3">
						{myLeagues.map((l) => (
							<button
								key={l.id}
								onClick={() => onLeagueChange(l.id, l.name)}
								className={`px-5 py-3 rounded-lg border transition-all font-bold shadow-sm
								${
									currentLeagueId === l.id
										? 'bg-orange-600 border-orange-500 text-white scale-105 shadow-orange-900/50'
										: 'bg-white/5 border-white/10 text-white hover:bg-white/20'
								}`}
							>
								{l.name}
							</button>
						))}
					</div>
				</div>
			)}

			{activeTab === 'create' && (
				<div className="flex gap-2">
					<input
						type="text"
						placeholder="New League Name..."
						className="bg-black/20 border border-white/10 p-3 rounded-lg text-white flex-1 placeholder-white/40 focus:outline-none focus:border-orange-500"
						value={newLeagueName}
						onChange={(e) => setNewLeagueName(e.target.value)}
					/>
					<button
						onClick={createLeague}
						disabled={isSubmitting}
						className="bg-green-500 hover:bg-green-600 disabled:bg-green-700 disabled:opacity-60 text-white px-6 rounded-lg font-bold shadow-lg transition-all"
					>
						{isSubmitting ? 'Creating...' : 'Create'}
					</button>
				</div>
			)}

			{activeTab === 'join' && (
				<div className="flex gap-2">
					<input
						type="text"
						placeholder="Paste Code Here..."
						className="bg-black/20 border border-white/10 p-3 rounded-lg text-white flex-1 placeholder-white/40 focus:outline-none focus:border-orange-500 font-mono"
						value={joinCode}
						onChange={(e) => setJoinCode(e.target.value)}
					/>
					<button
						onClick={joinLeague}
						disabled={isSubmitting}
						className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-700 disabled:opacity-60 text-white px-6 rounded-lg font-bold shadow-lg transition-all"
					>
						{isSubmitting ? 'Joining...' : 'Join'}
					</button>
				</div>
			)}
		</div>
	);
}