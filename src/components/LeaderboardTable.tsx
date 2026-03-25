import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { NBA_TEAMS, type Team } from '../lib/teams';

interface Props {
	leagueId: string;
	currentUserId: string;
	refreshTrigger?: number;
	currentUserName?: string;
}

interface LeaderboardEntry {
	user_id: string;
	username: string;
	total_score: number;
	west_score: number;
	east_score: number;
}

interface Standing {
	team_id: string;
	actual_rank: number;
	previous_rank: number;
}

export function LeaderboardTable({ leagueId, currentUserId, refreshTrigger, currentUserName }: Props) {
	const [loading, setLoading] = useState(true);
	const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
	const [standings, setStandings] = useState<Record<string, Standing>>({});
	const [predictionsMap, setPredictionsMap] = useState<Record<string, Record<string, number>>>({});

	useEffect(() => {
		if (leagueId) {
			fetchFullLeaderboardData();
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [leagueId, refreshTrigger]);

	async function fetchFullLeaderboardData() {
		setLoading(true);
		const { data: lbData } = await supabase
			.from('leaderboard')
			.select('user_id, username, total_score, west_score, east_score')
			.eq('league_id', leagueId)
			.order('total_score', { ascending: false });

		const { data: actualData } = await supabase.from('actual_standings').select('team_id, actual_rank, previous_rank');
		const { data: predsData } = await supabase.from('predictions').select('user_id, team_id, predicted_rank').eq('league_id', leagueId);

		const sMap: Record<string, Standing> = {};
		actualData?.forEach(s => sMap[s.team_id] = s);

		const pMap: Record<string, Record<string, number>> = {};
		predsData?.forEach(p => {
			if (!pMap[p.team_id]) pMap[p.team_id] = {};
			pMap[p.team_id][p.user_id] = p.predicted_rank;
		});

		setLeaderboard(lbData || []);
		setStandings(sMap);
		setPredictionsMap(pMap);
		setLoading(false);
	}

	const renderTrend = (teamId: string) => {
		const s = standings[teamId];
		if (!s || !s.previous_rank || s.previous_rank === s.actual_rank) {
			return <span className="text-gray-600 text-[10px] w-4 text-center">●</span>;
		}
		return s.previous_rank > s.actual_rank ? (
			<span className="text-green-500 text-[10px] w-4 text-center font-black animate-pulse">▲</span>
		) : (
			<span className="text-red-500 text-[10px] w-4 text-center font-black">▼</span>
		);
	};

	const renderPredictionBadge = (predictedRank?: number, actualRank?: number) => {
		if (!predictedRank) return <span className="text-gray-600 text-xs font-bold">-</span>;
		if (actualRank === undefined) return <div className="text-gray-300 font-bold text-center bg-white/5 rounded py-1 w-8 mx-auto">{predictedRank}</div>;

		const diff = predictedRank - actualRank;
		const absDiff = Math.abs(diff);

		let colorClass = 'bg-red-500/10 text-red-400 border-red-500/20';
		if (absDiff === 0) colorClass = 'bg-green-500/20 text-green-400 border-green-500/40 shadow-[0_0_10px_rgba(74,222,128,0.2)]';
		else if (absDiff === 1) colorClass = 'bg-lime-500/20 text-lime-400 border-lime-500/40';
		else if (absDiff === 2) colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
		else if (absDiff === 3) colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/40';

		const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '✔';

		return (
			<div className={`flex items-center justify-between px-2 py-1 rounded-md border font-black text-[11px] w-[3.8rem] mx-auto transition-all ${colorClass}`}>
				<span className="text-white text-[12px]">{predictedRank}</span>
				<div className="flex items-center gap-0.5 opacity-80">
					<span className="text-[9px]">{arrow}</span>
					{absDiff !== 0 && <span>{absDiff}</span>}
				</div>
			</div>
		);
	};

	const renderConferenceTable = (title: string, teams: Team[], conf: 'West' | 'East') => (
		<div className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
			<div className="bg-[#1D428A]/80 p-4 border-b border-white/10">
				<h3 className="text-lg font-black uppercase italic tracking-widest text-white">{title} Conference</h3>
			</div>
			<div className="overflow-x-auto scrollbar-hide">
				<table className="w-full text-left border-collapse min-w-max">
					<thead>
						<tr className="bg-[#0f172a] text-[10px] uppercase tracking-wider text-gray-400">
							<th className="sticky left-0 bg-[#0f172a] z-20 p-3 border-b border-white/5 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">Team</th>
							<th className="p-3 border-b border-white/5 text-center bg-white/5">Actual</th>
							{leaderboard.map((user) => (
								<th key={user.user_id} className={`p-3 border-b border-white/5 text-center min-w-[5rem] ${user.user_id === currentUserId ? 'bg-orange-900/20 text-orange-300' : ''}`}>
									<div className="flex flex-col items-center">
										<span className="text-white text-[11px] truncate max-w-[4.5rem]">
											{user.user_id === currentUserId && currentUserName ? currentUserName : user.username}
										</span>
										<span className="text-green-400 text-[10px] font-black">{conf === 'West' ? (user.west_score || 0) : (user.east_score || 0)} PTS</span>
									</div>
								</th>
							))}
						</tr>
					</thead>
					<tbody className="text-sm">
						{teams.map((team, idx) => {
							const actualRank = standings[team.id]?.actual_rank;
							return (
								<tr key={team.id} className="border-b border-white/5 hover:bg-white/5">
									<td className="sticky left-0 bg-[#162032] z-10 p-2 lg:p-3 flex items-center gap-2 lg:gap-3">
										<span className="text-gray-500 font-black w-3 text-[10px]">{idx + 1}.</span>
										<div className="flex items-center justify-center">
											{renderTrend(team.id)}
										</div>
										<img src={team.logo} className="w-5 h-5 lg:w-6 lg:h-6 object-contain" />
										<span className="font-bold text-gray-200 text-xs">{team.id}</span>
									</td>
									<td className="p-3 text-center bg-white/5 font-black text-white">{actualRank || '-'}</td>
									{leaderboard.map((user) => (
										<td key={user.user_id} className={`p-1 text-center ${user.user_id === currentUserId ? 'bg-orange-900/10' : ''}`}>
											{renderPredictionBadge(predictionsMap[team.id]?.[user.user_id], actualRank)}
										</td>
									))}
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</div>
	);

	if (loading) return <div className="text-center py-20 text-orange-400 animate-pulse font-black tracking-widest">LOADING LEADERBOARD...</div>;

	const westTeams = [...NBA_TEAMS.filter(t => t.conference === 'West')].sort((a, b) => (standings[a.id]?.actual_rank ?? 99) - (standings[b.id]?.actual_rank ?? 99));
	const eastTeams = [...NBA_TEAMS.filter(t => t.conference === 'East')].sort((a, b) => (standings[a.id]?.actual_rank ?? 99) - (standings[b.id]?.actual_rank ?? 99));
	const leaderScore = leaderboard[0]?.total_score || 0;

	return (
		<div className="w-full flex flex-col gap-6 items-center">
			<div className="w-full max-w-xl bg-black/40 rounded-2xl border border-white/10 p-4 shadow-xl">
				<h4 className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 mb-4 italic">Overall Scoreboard</h4>
				<div className="grid grid-cols-5 gap-2 text-center border-b border-white/5 pb-2 mb-2 text-[9px] font-black text-gray-500 uppercase tracking-widest">
					<div className="text-left pl-2">Player</div>
					<div>West</div>
					<div>East</div>
					<div className="text-white">Total</div>
					<div className="text-orange-500/80">Diff</div>
				</div>
				<div className="space-y-1">
					{leaderboard.length === 0 ? (
						<div className="col-span-5 text-center py-4 text-gray-500 text-xs uppercase tracking-widest">Waiting for predictions...</div>
					) : (
						leaderboard.map((user, idx) => {
							const diff = user.total_score - leaderScore;
							return (
								<div key={user.user_id} className={`grid grid-cols-5 gap-2 text-center py-2 rounded-lg transition-colors ${user.user_id === currentUserId ? 'bg-orange-500/10 border border-orange-500/20' : 'hover:bg-white/5'}`}>
									<div className="text-left pl-2 flex items-center gap-2">
										<span className="text-[10px] font-black text-gray-600">{idx + 1}.</span>
										<span className="font-bold text-gray-200 text-xs truncate">
											{user.user_id === currentUserId && currentUserName ? currentUserName : user.username}
										</span>
									</div>
									<div className="text-blue-400 font-bold text-xs">{user.west_score || 0}</div>
									<div className="text-blue-400 font-bold text-xs">{user.east_score || 0}</div>
									<div className="text-green-400 font-black text-xs">{user.total_score || 0}</div>
									<div className="text-orange-500/70 text-xs font-bold">{diff === 0 ? '-' : diff}</div>
								</div>
							);
						})
					)}
				</div>
			</div>
			{leaderboard.length > 0 && (
				<div className="w-full flex flex-col lg:flex-row gap-6 items-start">
					{renderConferenceTable('Western', westTeams, 'West')}
					{renderConferenceTable('Eastern', eastTeams, 'East')}
				</div>
			)}
		</div>
	);
}