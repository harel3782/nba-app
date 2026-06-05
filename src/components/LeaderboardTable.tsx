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
	wins: number;
	losses: number;
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
		// Only show the global spinner on the very first load
		if (leaderboard.length === 0) {
			setLoading(true);
		}

		const { data: lbData } = await supabase
			.from('leaderboard')
			.select('user_id, username, total_score, west_score, east_score')
			.eq('league_id', leagueId)
			.order('total_score', { ascending: false });

		const { data: actualData } = await supabase
			.from('official_regular_standings')
			.select('team_id, actual_rank, previous_rank, wins, losses');
		
		const { data: predsData } = await supabase
			.from('user_regular_picks')
			.select('user_id, team_id, predicted_rank')
			.eq('league_id', leagueId);

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
			<div className={`flex items-center justify-between px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md border font-black text-[9px] sm:text-[10px] lg:text-[11px] w-[3.2rem] sm:w-[3.5rem] lg:w-[3.8rem] mx-auto transition-all ${colorClass}`}>
				<span className="text-white text-[10px] sm:text-[11px] lg:text-[12px]">{predictedRank}</span>
				<div className="flex items-center gap-0.5 opacity-80">
					<span className="text-[8px] sm:text-[8px]">{arrow}</span>
					{absDiff !== 0 && <span className="text-[7px] sm:text-[8px]">{absDiff}</span>}
				</div>
			</div>
		);
	};

	const renderMobileCards = (teams: Team[]) => {
		return (
			<div className="space-y-3 px-2">
				{teams.map((team, idx) => {
					const s = standings[team.id];
					const actualRank = s?.actual_rank;
					return (
						<div key={team.id} className="bg-black/40 border border-white/10 rounded-lg p-3 shadow-lg backdrop-blur-sm">
							<div className="flex items-center justify-between mb-3">
								<div className="flex items-center gap-2">
									<span className="text-gray-500 font-black text-sm w-5">{idx + 1}.</span>
									<div className="flex items-center justify-center w-4">
										{renderTrend(team.id)}
									</div>
									<img src={team.logo} alt={team.id} className="w-5 h-5 object-contain" />
									<span className="font-bold text-gray-100 text-xs">{team.id}</span>
								</div>
								<div className="text-gray-400 text-[10px]">Rank: {actualRank || '-'}</div>
							</div>
							<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
								{leaderboard.map((user) => (
									<div key={user.user_id} className="text-center">
										<div className="text-[10px] font-bold text-gray-400 mb-1 truncate">
											{user.user_id === currentUserId && currentUserName ? currentUserName : user.username}
										</div>
										<div className="flex justify-center">
											{renderPredictionBadge(predictionsMap[team.id]?.[user.user_id], actualRank)}
										</div>
									</div>
								))}
							</div>
						</div>
					);
				})}
			</div>
		);
	};

	const renderConferenceTable = (title: string, teams: Team[], conf: 'West' | 'East') => {
		const leaderTeam = teams[0];
		const leaderStats = leaderTeam ? standings[leaderTeam.id] : null;

		return (
			<div className="flex-1 min-w-0 bg-black/20 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
				<div className="bg-[#1D428A]/80 p-4 border-b border-white/10">
					<h3 className="text-lg font-black uppercase italic tracking-widest text-white">{title} Conference</h3>
				</div>
				<div className="hidden sm:block overflow-x-auto scrollbar-hide">
					<table className="w-full text-left border-collapse">
						<thead>
							<tr className="bg-[#0f172a] text-xs uppercase tracking-wider text-gray-400">
								<th className="sticky left-0 bg-[#0f172a] z-20 p-1.5 sm:p-2 lg:p-4 border-b border-white/5 shadow-[2px_0_5px_rgba(0,0,0,0.3)]">Team</th>
								<th className="hidden sm:table-cell p-1.5 sm:p-2 lg:p-3 border-b border-white/10 border-l border-white/5 text-center bg-black/40 w-12">W</th>
								<th className="hidden sm:table-cell p-1.5 sm:p-2 lg:p-3 border-b border-white/10 border-l border-white/5 text-center bg-black/40 w-12">L</th>
								<th className="hidden sm:table-cell p-1.5 sm:p-2 lg:p-3 border-b border-white/10 border-l border-white/5 text-center bg-black/40 w-14 text-orange-400">GB</th>
								{leaderboard.map((user) => (
									<th key={user.user_id} className={`p-1.5 sm:p-2 lg:p-3 border-b border-white/5 text-center min-w-[4.5rem] lg:min-w-[5.5rem] border-l border-white/5 ${user.user_id === currentUserId ? 'bg-orange-900/20 text-orange-300' : ''}`}>
										<div className="flex flex-col items-center">
											<span className="text-white text-[9px] sm:text-[10px] lg:text-[11px] truncate max-w-[3.8rem] sm:max-w-[4.5rem] lg:max-w-[4.8rem]">
												{user.user_id === currentUserId && currentUserName ? currentUserName : user.username}
											</span>
											<span className="text-green-400 text-[8px] sm:text-[9px] lg:text-[10px] font-black">{conf === 'West' ? (user.west_score || 0) : (user.east_score || 0)} PTS</span>
										</div>
									</th>
								))}
							</tr>
						</thead>
						<tbody className="text-sm">
							{teams.map((team, idx) => {
								const s = standings[team.id];
								const actualRank = s?.actual_rank;
								
								let gbDisplay = "-";
								if (leaderStats && s && idx > 0) {
									const gbValue = ((leaderStats.wins - s.wins) + (s.losses - leaderStats.losses)) / 2;
									gbDisplay = gbValue.toString();
								}

								return (
									<tr key={team.id} className="border-b border-white/5 hover:bg-white/5 group">
										<td className="sticky left-0 bg-[#162032] z-10 p-1.5 sm:p-2 lg:p-4">
											<div className="flex items-center gap-2 sm:gap-3">
												<span className="text-gray-500 font-black w-4 text-[11px]">{idx + 1}.</span>
												<div className="flex items-center justify-center">
													{renderTrend(team.id)}
												</div>
												<img src={team.logo} alt={team.id} className="w-6 h-6 object-contain" />
												<span className="font-bold text-gray-200 text-xs tracking-wide">{team.id}</span>
											</div>
										</td>
										<td className="hidden sm:table-cell p-1.5 sm:p-2 lg:p-3 text-center bg-black/30 border-l border-white/5 font-bold text-white text-xs">{s?.wins ?? '-'}</td>
										<td className="hidden sm:table-cell p-1.5 sm:p-2 lg:p-3 text-center bg-black/30 border-l border-white/5 font-bold text-white text-xs">{s?.losses ?? '-'}</td>
										<td className="hidden sm:table-cell p-1.5 sm:p-2 lg:p-3 text-center bg-black/30 border-l border-white/5 font-bold text-white text-xs">{gbDisplay}</td>
										{leaderboard.map((user) => (
											<td key={user.user_id} className={`p-2 text-center border-l border-white/5 ${user.user_id === currentUserId ? 'bg-orange-900/10' : ''}`}>
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
	};

	if (loading && leaderboard.length === 0) return <div className="text-center py-24 text-orange-400 animate-pulse font-black tracking-widest italic">LOADING LEADERBOARD...</div>;

	const westTeams = [...NBA_TEAMS.filter(t => t.conference === 'West')].sort((a, b) => (standings[a.id]?.actual_rank ?? 99) - (standings[b.id]?.actual_rank ?? 99));
	const eastTeams = [...NBA_TEAMS.filter(t => t.conference === 'East')].sort((a, b) => (standings[a.id]?.actual_rank ?? 99) - (standings[b.id]?.actual_rank ?? 99));
	const leaderScore = leaderboard[0]?.total_score || 0;

	return (
		<div className="w-full flex flex-col gap-8 items-center max-w-full">
			<div className="w-full max-w-2xl bg-black/40 rounded-3xl border border-white/10 p-5 shadow-2xl backdrop-blur-xl relative">
				{loading && (
					<div className="absolute top-2 right-4 flex items-center gap-2">
						<div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
						<span className="text-[8px] font-black text-orange-500 uppercase italic">Updating...</span>
					</div>
				)}
				<h4 className="text-center text-[11px] font-black uppercase tracking-[0.4em] text-orange-400 mb-5 italic">Overall Scoreboard</h4>
				<div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center border-b border-white/10 pb-3 mb-3 text-[10px] sm:text-xs font-black text-gray-500 uppercase tracking-widest">
					<div className="text-left pl-3">Player</div>
					<div className="hidden sm:block">West</div>
					<div className="hidden sm:block">East</div>
					<div className="text-white">Total</div>
					<div className="text-orange-500/80">Diff</div>
				</div>
				<div className="space-y-1.5">
					{leaderboard.length === 0 ? (
						<div className="col-span-5 text-center py-6 text-gray-500 text-xs uppercase tracking-widest font-bold">Waiting for predictions...</div>
					) : (
						leaderboard.map((user, idx) => {
							const diff = user.total_score - leaderScore;
							return (
								<div key={user.user_id} className={`grid grid-cols-3 sm:grid-cols-5 gap-2 text-center py-2.5 rounded-xl transition-all ${user.user_id === currentUserId ? 'bg-orange-500/15 border border-orange-500/30 shadow-lg' : 'hover:bg-white/5 border border-transparent'}`}>
									<div className="text-left pl-2 sm:pl-3 flex items-center gap-1.5 sm:gap-2.5 min-w-0">
										<span className="text-[10px] sm:text-[11px] font-black text-gray-600 flex-shrink-0">{idx + 1}.</span>
										<span className="font-bold text-gray-100 text-xs truncate">
											{user.user_id === currentUserId && currentUserName ? currentUserName : user.username}
										</span>
									</div>
									<div className="hidden sm:block text-blue-400/90 font-bold text-xs">{user.west_score || 0}</div>
									<div className="hidden sm:block text-blue-400/90 font-bold text-xs">{user.east_score || 0}</div>
									<div className="text-green-400 font-black text-sm">{user.total_score || 0}</div>
									<div className="text-orange-500/80 text-xs font-black">{diff === 0 ? '-' : diff}</div>
								</div>
							);
						})
					)}
				</div>
			</div>
			<div className="w-full flex flex-col xl:flex-row gap-8 items-start">
				<div className="sm:hidden w-full">
					<h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-4">West</h2>
					{renderMobileCards(westTeams)}
					<h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-4 mt-6">East</h2>
					{renderMobileCards(eastTeams)}
				</div>
				<div className="hidden sm:flex w-full gap-8">
					{renderConferenceTable('Western', westTeams, 'West')}
					{renderConferenceTable('Eastern', eastTeams, 'East')}
				</div>
			</div>
		</div>
	);
}