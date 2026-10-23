import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ShareLeaderboardButton } from './ShareLeaderboardButton';
import { getStagePoints, type ScoringConfig } from '../lib/scoring';
import { countExactPicks, rankEntries } from '../lib/ranking';

interface Props {
	leagueId: string;
	leagueName: string;
	scoringConfig: ScoringConfig | null;
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
	exact_picks: number;
	rank: number;
}

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

export function CombinedLeaderboard({ leagueId, leagueName, scoringConfig, currentUserId, refreshTrigger, currentUserName }: Props) {
	const [loading, setLoading] = useState(true);
	const [leaderboard, setLeaderboard] = useState<UserScore[]>([]);

	useEffect(() => {
		if (leagueId) fetchAndCalculate();
	}, [leagueId, refreshTrigger, scoringConfig]);

	async function fetchAndCalculate() {
		// Only show global loading on first fetch
		if (leaderboard.length === 0) {
			setLoading(true);
		}

		const { data: regData } = await supabase
			.from('leaderboard')
			.select('user_id, username, total_score')
			.eq('league_id', leagueId);

		const { data: actuals } = await supabase
			.from('official_playoff_results')
			.select('match_id, winning_team_id, actual_games');

		const { data: predicts } = await supabase
			.from('user_bracket_picks')
			.select('user_id, stage_slug, team_id, predicted_games')
			.eq('league_id', leagueId);

		const { data: regularPicks } = await supabase
			.from('user_regular_picks')
			.select('user_id, team_id, predicted_rank')
			.eq('league_id', leagueId);

		const { data: standings } = await supabase
			.from('official_regular_standings')
			.select('team_id, actual_rank');

		if (!regData || !actuals || !predicts) {
			setLoading(false);
			return;
		}

		const exact = countExactPicks(regularPicks ?? [], Object.fromEntries((standings ?? []).map(s => [s.team_id, s.actual_rank])));
		const scores: Record<string, Omit<UserScore, 'rank'>> = {};

		regData.forEach(u => {
			scores[u.user_id] = {
				user_id: u.user_id,
				username: u.username || 'User',
				regular_points: u.total_score || 0,
				bracket_points: 0,
				total_combined: 0,
				exact_picks: exact[u.user_id] ?? 0
			};
		});

		predicts.forEach(p => {
			const officialMatchId = ID_MAPPING[p.stage_slug];
			if (!officialMatchId) return;

			const res = actuals.find(a => a.match_id === officialMatchId);

			if (res && res.winning_team_id === p.team_id) {
				const pts = getStagePoints(p.stage_slug, scoringConfig);
				
				if (scores[p.user_id]) {
					scores[p.user_id].bracket_points += pts.win;
					
					if (!p.stage_slug.includes('_PI_') && res.actual_games === p.predicted_games) {
						scores[p.user_id].bracket_points += pts.bonus;
					}
				}
			}
		});

		const finalData = rankEntries(
			Object.values(scores).map(u => ({ ...u, total_combined: u.regular_points + u.bracket_points })),
			(a, b) => b.total_combined - a.total_combined || b.exact_picks - a.exact_picks || b.bracket_points - a.bracket_points
		);

		setLeaderboard(finalData);
		setLoading(false);
	}

	if (loading && leaderboard.length === 0) return <div className="text-center py-10 animate-pulse text-orange-500 font-black italic">CALCULATING SCORES...</div>;

	return (
		<div className="w-full space-y-4 animate-fade-in">
			<div className="bg-black/40 rounded-3xl border border-white/10 overflow-hidden shadow-2xl backdrop-blur-xl relative">
				{/* Silent refresh indicator */}
				{loading && leaderboard.length > 0 && (
					<div className="absolute top-4 right-6 flex items-center gap-2 z-10">
						<div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping"></div>
					</div>
				)}
				<div className="bg-gradient-to-r from-[#1D428A] to-[#C8102E] p-4 border-b border-white/10 flex items-center justify-between gap-3">
					<h2 className="text-lg font-black italic text-white uppercase tracking-tighter">🏆 Global Playoff Rankings</h2>
					<ShareLeaderboardButton
						leagueName={leagueName}
						title="Combined Standings"
						columns={['Reg', 'Playoff', 'Total']}
						rows={leaderboard.map(u => ({
							name: u.user_id === currentUserId && currentUserName ? currentUserName : u.username,
							values: [u.regular_points, `+${u.bracket_points}`, u.total_combined],
							isMe: u.user_id === currentUserId,
							rank: u.rank,
						}))}
					/>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-black/60 text-xs uppercase tracking-widest text-gray-400">
								<th className="p-2 sm:p-4 w-12">#</th>
								<th className="p-2 sm:p-4">Player</th>
								<th className="p-2 sm:p-4 text-center">Regular</th>
								<th className="p-2 sm:p-4 text-center">Playoff</th>
								<th className="p-2 sm:p-4 text-right text-orange-400">Total</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{leaderboard.length === 0 ? (
								<tr>
									<td colSpan={5} className="p-4 sm:p-10 text-center text-gray-500 text-xs uppercase tracking-widest font-bold">Waiting for predictions...</td>
								</tr>
							) : (
								leaderboard.map((user) => (
									<tr key={user.user_id} className={`transition-all ${user.user_id === currentUserId ? 'bg-orange-500/10' : 'hover:bg-white/5'}`}>
										<td className="p-2 sm:p-4 font-black text-gray-500">{user.rank}.</td>
										<td className="p-2 sm:p-4 font-bold text-white text-sm">
											{user.user_id === currentUserId && currentUserName ? currentUserName : user.username}
											{leaderboard.some(o => o.user_id !== user.user_id && o.total_combined === user.total_combined) && (
												<span title="Exact regular-season picks (tiebreaker)" className="ml-2 text-[9px] font-black text-yellow-400/90 bg-yellow-500/10 border border-yellow-500/20 rounded px-1 align-middle">
													🎯{user.exact_picks}
												</span>
											)}
										</td>
										<td className="p-2 sm:p-4 text-center text-blue-300 font-bold text-xs">{user.regular_points}</td>
										<td className="p-2 sm:p-4 text-center text-green-400 font-black text-xs">+{user.bracket_points}</td>
										<td className="p-2 sm:p-4 text-right font-black text-xl text-orange-500 italic">{user.total_combined}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}