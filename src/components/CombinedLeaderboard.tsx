import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Props {
	leagueId: string;
	currentUserId: string;
	refreshTrigger?: number;
	currentUserName?: string;
}

interface UserScore {
	user_id: string;
	username: string;
	regular_points: number;
	bracket_points: number;
	total_combined: number;
}

// ID Mapping dictionary for accurate bracket vs database matching
const ID_MAPPING: Record<string, string> = {
	'W_PI_78': 'w_pi_7v8',
	'W_PI_910': 'w_pi_9v10',
	'W_PI_8TH': 'w_pi_8th',
	'W_R1_1': 'w_r1_1vs8',
	'W_R1_2': 'w_r1_4vs5',
	'W_R1_3': 'w_r1_3vs6',
	'W_R1_4': 'w_r1_2vs7',
	'W_R2_1': 'w_semi_1',
	'W_R2_2': 'w_semi_2',
	'W_CF': 'w_conf_final',
	'E_PI_78': 'e_pi_7v8',
	'E_PI_910': 'e_pi_9v10',
	'E_PI_8TH': 'e_pi_8th',
	'E_R1_1': 'e_r1_1vs8',
	'E_R1_2': 'e_r1_4vs5',
	'E_R1_3': 'e_r1_3vs6',
	'E_R1_4': 'e_r1_2vs7',
	'E_R2_1': 'e_semi_1',
	'E_R2_2': 'e_semi_2',
	'E_CF': 'e_conf_final',
	'FINALS': 'nba_finals'
};

export function CombinedLeaderboard({ leagueId, currentUserId, refreshTrigger, currentUserName }: Props) {
	const [loading, setLoading] = useState(true);
	const [leaderboard, setLeaderboard] = useState<UserScore[]>([]);

	useEffect(() => {
		if (leagueId) fetchAndCalculate();
	}, [leagueId, refreshTrigger]);

	async function fetchAndCalculate() {
		setLoading(true);

		const { data: regData } = await supabase
			.from('leaderboard')
			.select('user_id, username, total_score')
			.eq('league_id', leagueId);

		const { data: actuals } = await supabase
			.from('official_playoff_results')
			.select('match_id, winning_team_id, actual_games');

		// Fetch bracket predictions from the new table
		const { data: predicts } = await supabase
			.from('user_bracket_picks')
			.select('user_id, stage_slug, team_id, predicted_games')
			.eq('league_id', leagueId);

		if (!regData || !actuals || !predicts) {
			setLoading(false);
			return;
		}

		const getStagePoints = (slug: string) => {
			if (slug === 'FINALS') return { win: 80, bonus: 40 };
			if (slug.includes('CF')) return { win: 40, bonus: 20 };
			if (slug.includes('R2')) return { win: 20, bonus: 10 };
			if (slug.includes('R1')) return { win: 10, bonus: 5 };
			return { win: 5, bonus: 0 };
		};

		const scores: Record<string, UserScore> = {};

		regData.forEach(u => {
			scores[u.user_id] = {
				user_id: u.user_id,
				username: u.username || 'User',
				regular_points: u.total_score || 0,
				bracket_points: 0,
				total_combined: 0
			};
		});

		predicts.forEach(p => {
			const officialMatchId = ID_MAPPING[p.stage_slug];
			if (!officialMatchId) return;

			const res = actuals.find(a => a.match_id === officialMatchId);

			if (res && res.winning_team_id === p.team_id) {
				const pts = getStagePoints(p.stage_slug);
				
				if (scores[p.user_id]) {
					scores[p.user_id].bracket_points += pts.win;
					
					if (!p.stage_slug.includes('_PI_') && res.actual_games === p.predicted_games) {
						scores[p.user_id].bracket_points += pts.bonus;
					}
				}
			}
		});

		const finalData = Object.values(scores).map(u => ({
			...u,
			total_combined: u.regular_points + u.bracket_points
		})).sort((a, b) => b.total_combined - a.total_combined);

		setLeaderboard(finalData);
		setLoading(false);
	}

	if (loading) return <div className="text-center py-10 animate-pulse text-orange-500 font-black italic">CALCULATING SCORES...</div>;

	return (
		<div className="w-full space-y-4 animate-fade-in">
			<div className="bg-black/40 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl">
				<div className="bg-gradient-to-r from-[#1D428A] to-[#C8102E] p-4 border-b border-white/10 text-center">
					<h2 className="text-lg font-black italic text-white uppercase tracking-tighter">🏆 Global Playoff Rankings</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-black/60 text-[9px] uppercase tracking-widest text-gray-400">
								<th className="p-4 w-12">#</th>
								<th className="p-4">Player</th>
								<th className="p-4 text-center">Regular</th>
								<th className="p-4 text-center">Playoff</th>
								<th className="p-4 text-right text-orange-400">Total</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{leaderboard.map((user, idx) => (
								<tr key={user.user_id} className={`transition-all ${user.user_id === currentUserId ? 'bg-orange-500/10' : ''}`}>
									<td className="p-4 font-black text-gray-500">{idx + 1}.</td>
									<td className="p-4 font-bold text-white text-sm">
										{user.user_id === currentUserId && currentUserName ? currentUserName : user.username}
									</td>
									<td className="p-4 text-center text-blue-300 font-bold text-xs">{user.regular_points}</td>
									<td className="p-4 text-center text-green-400 font-black text-xs">+{user.bracket_points}</td>
									<td className="p-4 text-right font-black text-xl text-orange-500 italic">{user.total_combined}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}