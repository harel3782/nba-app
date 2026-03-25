import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Props {
	leagueId: string;
	currentUserId: string;
	refreshTrigger?: number;
}

export function RegularLeaderboard({ leagueId, currentUserId, refreshTrigger }: Props) {
	const [leaderboard, setLeaderboard] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchLeaderboard();
	}, [leagueId, refreshTrigger]);

	async function fetchLeaderboard() {
		setLoading(true);
		const { data, error } = await supabase
			.from('leaderboard')
			.select('*')
			.eq('league_id', leagueId);

		if (!error && data) {
			setLeaderboard(data);
		}
		setLoading(false);
	}

	if (loading) return <div className="text-center py-10 animate-pulse text-gray-500 font-bold uppercase tracking-widest text-[10px]">Loading Season Standings...</div>;

	return (
		<div className="bg-black/20 rounded-2xl border border-white/5 overflow-hidden shadow-xl">
			<div className="bg-white/5 px-6 py-3 border-b border-white/5">
				<h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Regular Season Standings (10/6/3/1/0)</h3>
			</div>
			<table className="w-full text-left border-collapse">
				<thead>
					<tr className="bg-black/40 text-[9px] uppercase tracking-widest text-gray-500">
						<th className="p-4">Rank</th>
						<th className="p-4">Player</th>
						<th className="p-4 text-right">Points</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-white/5">
					{leaderboard.map((user, idx) => (
						<tr key={user.user_id} className={`transition-colors ${user.user_id === currentUserId ? 'bg-blue-500/10' : 'hover:bg-white/5'}`}>
							<td className="p-4 text-xs font-black text-gray-500">{idx + 1}.</td>
							<td className="p-4 text-xs font-bold text-white">{user.username}</td>
							<td className="p-4 text-xs text-right font-black text-blue-400">{user.total_score}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}