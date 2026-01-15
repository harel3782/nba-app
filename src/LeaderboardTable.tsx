import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

interface LeaderboardEntry {
	user_id: string;
	username: string;
	total_score: number;
	league_id: string;
}

interface Props {
	leagueId: string;
	currentUserId: string;
	refreshTrigger: number; // Prop to trigger re-fetch
}

export function LeaderboardTable({ leagueId, currentUserId, refreshTrigger }: Props) {
	const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [scoringType, setScoringType] = useState<string>('linear');

	useEffect(() => {
		fetchLeaderboard();
		// Re-fetch when league changes or refresh is triggered
	}, [leagueId, refreshTrigger]);

	const fetchLeaderboard = async () => {
		try {
			setLoading(true);

			// 1. Fetch league settings (to display scoring type)
			const { data: leagueData } = await supabase
				.from('leagues')
				.select('scoring_type')
				.eq('id', leagueId)
				.single();

			if (leagueData) setScoringType(leagueData.scoring_type);

			// 2. Fetch Leaderboard - Sort Ascending (Golf Logic)
			const { data, error } = await supabase
				.from('leaderboard')
				.select('*')
				.eq('league_id', leagueId)
				.order('total_score', { ascending: true }); // Lower is better!

			if (error) throw error;
			setLeaders(data || []);
		} catch (error) {
			console.error('Error fetching leaderboard:', error);
		} finally {
			setLoading(false);
		}
	};

	const getRankIcon = (index: number) => {
		switch (index) {
			case 0:
				return <span className="text-2xl drop-shadow-lg">🥇</span>;
			case 1:
				return <span className="text-2xl drop-shadow-lg">🥈</span>;
			case 2:
				return <span className="text-2xl drop-shadow-lg">🥉</span>;
			default:
				return <span className="font-mono text-gray-400 font-bold">#{index + 1}</span>;
		}
	};

	if (loading)
		return (
			<div className="text-center py-10 text-white/50 animate-pulse">Loading Rankings...</div>
		);

	return (
		<div className="w-full max-w-4xl bg-white/10 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden border border-white/20 mb-8">
			{/* Table Header */}
			<div className="bg-[#000000]/30 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-white/10">
				<div className="flex items-center gap-2">
					<span className="text-xl">🏆</span>
					<h2 className="text-xl font-bold text-white uppercase tracking-wider">
						Leaderboard
					</h2>
				</div>

				{/* Scoring Type Badge */}
				<div className="flex items-center gap-3">
					<div className="text-[10px] bg-yellow-500/20 text-yellow-200 px-3 py-1 rounded-full border border-yellow-500/30 flex items-center gap-1">
						<span>⛳</span>
						<span className="font-bold">GOLF RULES: LOWER IS BETTER</span>
					</div>
					<div
						className={`text-[10px] px-3 py-1 rounded-full border font-bold uppercase tracking-wider ${scoringType === 'squared' ? 'bg-red-900/40 text-red-300 border-red-500/50' : 'bg-blue-900/40 text-blue-300 border-blue-500/50'}`}
					>
						Mode: {scoringType === 'squared' ? 'Hardcore (x²)' : 'Standard'}
					</div>
				</div>
			</div>

			<div className="overflow-x-auto">
				<table className="w-full text-left border-collapse">
					<thead className="bg-black/20 text-blue-200 uppercase text-xs">
						<tr>
							<th className="py-4 px-6 text-center w-24">Rank</th>
							<th className="py-4 px-6">Player</th>
							<th className="py-4 px-6 text-right w-32">Total Score</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/5">
						{leaders.length === 0 ? (
							<tr>
								<td colSpan={3} className="text-center py-8 text-white/40">
									No predictions yet in this league.
								</td>
							</tr>
						) : (
							leaders.map((player, index) => {
								const isMe = player.user_id === currentUserId;
								return (
									<tr
										key={player.user_id}
										className={`transition-all duration-300 ${isMe ? 'bg-orange-500/20 hover:bg-orange-500/30' : 'hover:bg-white/5'}`}
									>
										<td className="py-4 px-6 text-center">
											<div className="flex justify-center items-center h-8">
												{getRankIcon(index)}
											</div>
										</td>
										<td className="py-4 px-6">
											<div className="flex items-center gap-3">
												<div
													className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${isMe ? 'bg-gradient-to-br from-orange-400 to-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}
												>
													{player.username.charAt(0).toUpperCase()}
												</div>
												<span
													className={`font-bold ${isMe ? 'text-orange-300' : 'text-white'} ${index === 0 ? 'text-yellow-400' : ''}`}
												>
													{player.username} {isMe && '(You)'}
												</span>
											</div>
										</td>
										<td className="py-4 px-6 text-right">
											<span
												className={`font-black text-xl font-mono ${index === 0 ? 'text-green-400' : 'text-white'}`}
											>
												{player.total_score}
											</span>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}
