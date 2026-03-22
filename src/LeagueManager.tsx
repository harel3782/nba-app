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
	}, [userId]);

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
		<div className="bg-black/40 backdrop-blur-xl border border-white/10 p-6 rounded-2xl shadow-2xl">
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
				{/* League Selection Dropdown */}
				<div>
					<label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
						My Active Leagues
					</label>
					<div className="relative">
						<select 
							value={currentLeagueId || ''} 
							onChange={(e) => onLeagueChange(e.target.value)}
							// FIX: Explicit bg-slate-900 and text-white to prevent browser defaults
							className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-orange-500 transition-all appearance-none cursor-pointer"
						>
							<option value="" className="bg-[#0f172a] text-gray-400">Select a League</option>
							{leagues.map((l) => (
								<option key={l.id} value={l.id} className="bg-[#0f172a] text-white">
									{l.name}
								</option>
							))}
						</select>
						{/* Custom arrow so it doesn't look like a standard Windows/Mac dropdown */}
						<div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 text-xs">
							▼
						</div>
					</div>
				</div>

				{/* Create Section */}
				<div>
					<label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
						Create New
					</label>
					<div className="flex gap-2">
						<input 
							type="text" 
							placeholder="League Name" 
							value={newLeagueName} 
							onChange={(e) => setNewLeagueName(e.target.value)} 
							className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500" 
						/>
						<button 
							onClick={createLeague} 
							disabled={loading} 
							className="bg-orange-500 hover:bg-orange-600 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
						>
							Create
						</button>
					</div>
				</div>

				{/* Join Section */}
				<div>
					<label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
						Join via ID
					</label>
					<div className="flex gap-2">
						<input 
							type="text" 
							placeholder="Paste ID here" 
							value={joinLeagueId} 
							onChange={(e) => setJoinLeagueId(e.target.value)} 
							className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500" 
						/>
						<button 
							onClick={joinLeague} 
							disabled={loading} 
							className="bg-white/5 hover:bg-white/10 border border-white/10 px-4 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all disabled:opacity-50"
						>
							Join
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}