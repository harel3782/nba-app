import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface League {
	id: string;
	name: string;
}

interface Props {
	userId: string;
	currentLeagueId: string | null;
	onLeagueChange: (id: string) => void;
}

export function LeagueManager({ userId, currentLeagueId, onLeagueChange }: Props) {
	const [leagues, setLeagues] = useState<League[]>([]);
	const [newLeagueName, setNewLeagueName] = useState('');
	const [joinLeagueId, setJoinLeagueId] = useState('');
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		fetchLeagues();
	}, [userId]); // refreshTrigger is handled by the "key" in App.tsx

	async function fetchLeagues() {
		const { data, error } = await supabase
			.from('league_members')
			.select('leagues(id, name)')
			.eq('user_id', userId);

		if (!error && data) {
			const formatted = data.map((item: any) => item.leagues).filter(Boolean);
			setLeagues(formatted);
		}
	}

	async function createLeague() {
		if (!newLeagueName.trim()) return;
		setLoading(true);
		try {
			const { data, error } = await supabase
				.from('leagues')
				.insert({ name: newLeagueName, created_by: userId })
				.select()
				.single();

			if (error) throw error;
			await supabase.from('league_members').insert({ league_id: data.id, user_id: userId });
			setNewLeagueName('');
			fetchLeagues();
			onLeagueChange(data.id);
		} catch (err) {
			console.error(err);
		} finally {
			setLoading(false);
		}
	}

	async function joinLeague() {
		if (!joinLeagueId.trim()) return;
		setLoading(true);
		try {
			const { error } = await supabase
				.from('league_members')
				.insert({ league_id: joinLeagueId, user_id: userId });
			if (error) throw error;
			setJoinLeagueId('');
			fetchLeagues();
			onLeagueChange(joinLeagueId);
		} catch (err) {
			alert('League not found or already joined');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="bg-black/20 backdrop-blur-sm border border-white/10 p-6 rounded-2xl shadow-xl">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				<div>
					<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">My Leagues</label>
					<select 
						value={currentLeagueId || ''} 
						onChange={(e) => onLeagueChange(e.target.value)}
						className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none"
					>
						<option value="">Select a League</option>
						{leagues.map((l) => (
							<option key={l.id} value={l.id}>{l.name}</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Create League</label>
					<div className="flex gap-2">
						<input type="text" placeholder="Name" value={newLeagueName} onChange={(e) => setNewLeagueName(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" />
						<button onClick={createLeague} disabled={loading} className="bg-orange-500 px-4 rounded-xl font-bold text-xs">Create</button>
					</div>
				</div>
				<div>
					<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Join with ID</label>
					<div className="flex gap-2">
						<input type="text" placeholder="League ID" value={joinLeagueId} onChange={(e) => setJoinLeagueId(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm" />
						<button onClick={joinLeague} disabled={loading} className="bg-white/10 px-4 rounded-xl font-bold text-xs border border-white/10">Join</button>
					</div>
				</div>
			</div>
		</div>
	);
}