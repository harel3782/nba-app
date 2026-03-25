import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Team {
	id: string;
	conference: string;
	actual_rank: number;
}

interface MatchResult {
	winner: string;
	games: number;
}

export function AdminResultsControl() {
	const [teams, setTeams] = useState<Team[]>([]);
	const [results, setResults] = useState<Record<string, MatchResult>>({});
	const [loading, setLoading] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	useEffect(() => {
		fetchData();
	}, []);

	async function fetchData() {
		// Fetch from the newly renamed official standings table
		const { data: standings } = await supabase
			.from('official_regular_standings')
			.select('team_id, conference, actual_rank')
			.order('actual_rank', { ascending: true });

		const { data: official } = await supabase
			.from('official_playoff_results')
			.select('match_id, winning_team_id, actual_games');

		if (standings) {
			setTeams(standings.map(t => ({
				id: t.team_id,
				conference: t.conference,
				actual_rank: parseInt(t.actual_rank.toString())
			})));
		}

		if (official) {
			const resultsMap: Record<string, MatchResult> = {};
			official.forEach((r) => {
				resultsMap[r.match_id] = {
					winner: r.winning_team_id,
					games: r.actual_games || 1 // Default to 1 for Play-in, will be 4-7 for others
				};
			});
			setResults(resultsMap);
			setHasChanges(false);
		}
	}

	const handleWinnerChange = (matchId: string, teamId: string) => {
		const isPlayIn = matchId.includes('pi_');
		setResults(prev => ({
			...prev,
			[matchId]: { 
				winner: teamId, 
				games: isPlayIn ? 1 : (prev[matchId]?.games || 4) 
			}
		}));
		setHasChanges(true);
	};

	const handleGamesChange = (matchId: string, games: number) => {
		setResults(prev => ({
			...prev,
			[matchId]: { ...prev[matchId], winner: prev[matchId]?.winner || "", games: games }
		}));
		setHasChanges(true);
	};

	async function saveAllToDatabase() {
		setLoading(true);
		try {
			const rowsToUpsert = Object.entries(results)
				.filter(([_, data]) => data.winner !== "")
				.map(([matchId, data]) => ({
					match_id: matchId,
					winning_team_id: data.winner,
					actual_games: data.games
				}));

			if (rowsToUpsert.length > 0) {
				const { error } = await supabase
					.from('official_playoff_results')
					.upsert(rowsToUpsert, { onConflict: 'match_id' });

				if (error) throw error;
				await supabase.rpc('refresh_all_leaderboards');
				alert("✅ Results saved!");
				setHasChanges(false);
			}
		} catch (err) {
			console.error("Save failed:", err);
		} finally {
			setLoading(false);
		}
	}

	const renderMatchRow = (label: string, matchId: string, options: (string | undefined)[], isSpecial = false) => {
		const validOptions = options.filter((id): id is string => !!id);
		const current = results[matchId] || { winner: "", games: matchId.includes('pi_') ? 1 : 4 };
		const isPlayIn = matchId.includes('pi_');

		return (
			<div className={`flex flex-col gap-2 p-3 rounded-lg border ${isSpecial ? 'bg-orange-500/10 border-orange-500/40' : 'bg-black/30 border-white/10'} mb-2`}>
				<span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">{label}</span>
				<div className="flex gap-3">
					<select 
						className="flex-1 bg-black/60 border border-white/20 py-2 px-3 rounded-md text-xs font-bold text-white outline-none focus:border-blue-500"
						value={current.winner}
						onChange={(e) => handleWinnerChange(matchId, e.target.value)}
					>
						<option value="">Select Winner...</option>
						{validOptions.map(id => <option key={id} value={id}>{id}</option>)}
					</select>
					
					{!isPlayIn && (
						<select 
							className="w-24 bg-black/60 border border-white/20 py-2 px-3 rounded-md text-xs font-bold text-orange-400 outline-none focus:border-orange-500"
							value={current.games}
							onChange={(e) => handleGamesChange(matchId, parseInt(e.target.value))}
						>
							{[4, 5, 6, 7].map(g => <option key={g} value={g}>{g} Games</option>)}
						</select>
					)}
				</div>
			</div>
		);
	};

	const renderConfColumn = (conf: 'West' | 'East') => {
		const confTeams = teams.filter(t => t.conference === conf);
		const prefix = conf === 'West' ? 'w_' : 'e_';

		const s1 = confTeams.find(t => t.actual_rank === 1)?.id;
		const s2 = confTeams.find(t => t.actual_rank === 2)?.id;
		const s3 = confTeams.find(t => t.actual_rank === 3)?.id;
		const s4 = confTeams.find(t => t.actual_rank === 4)?.id;
		const s5 = confTeams.find(t => t.actual_rank === 5)?.id;
		const s6 = confTeams.find(t => t.actual_rank === 6)?.id;
		const s7 = confTeams.find(t => t.actual_rank === 7)?.id;
		const s8 = confTeams.find(t => t.actual_rank === 8)?.id;
		const s9 = confTeams.find(t => t.actual_rank === 9)?.id;
		const s10 = confTeams.find(t => t.actual_rank === 10)?.id;

		const winner7v8 = results[`${prefix}pi_7v8`]?.winner;
		const winner8th = results[`${prefix}pi_8th`]?.winner;
		const winR1_1 = results[`${prefix}r1_1vs8`]?.winner;
		const winR1_4 = results[`${prefix}r1_4vs5`]?.winner;
		const winR1_3 = results[`${prefix}r1_3vs6`]?.winner;
		const winR1_2 = results[`${prefix}r1_2vs7`]?.winner;
		const winSemi1 = results[`${prefix}semi_1`]?.winner;
		const winSemi2 = results[`${prefix}semi_2`]?.winner;

		return (
			<div className="flex-1 space-y-6">
				<h4 className={`text-sm font-black italic uppercase border-b-2 ${conf === 'West' ? 'border-blue-500 text-blue-400' : 'border-red-500 text-red-400'} pb-2 tracking-widest`}>
					{conf} Conference
				</h4>
				
				<div className="space-y-2">
					<p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Play-In (Single Game)</p>
					{renderMatchRow("7 vs 8 Winner", `${prefix}pi_7v8`, [s7, s8])}
					{renderMatchRow("9 vs 10 Winner", `${prefix}pi_9v10`, [s9, s10])}
					{renderMatchRow("8th Seed Final", `${prefix}pi_8th`, [s7, s8, s9, s10], true)}
				</div>

				<div className="space-y-2">
					<p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">First Round (Best of 7)</p>
					{renderMatchRow("1 vs 8 Winner", `${prefix}r1_1vs8`, [s1, winner8th])}
					{renderMatchRow("4 vs 5 Winner", `${prefix}r1_4vs5`, [s4, s5])}
					{renderMatchRow("3 vs 6 Winner", `${prefix}r1_3vs6`, [s3, s6])}
					{renderMatchRow("2 vs 7 Winner", `${prefix}r1_2vs7`, [s2, winner7v8])}
				</div>

				<div className="space-y-2">
					<p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Conference Semis & Finals</p>
					{renderMatchRow("Semi 1 Winner", `${prefix}semi_1`, [winR1_1, winR1_4], true)}
					{renderMatchRow("Semi 2 Winner", `${prefix}semi_2`, [winR1_2, winR1_3], true)}
					{renderMatchRow("Conference Champion", `${prefix}conf_final`, [winSemi1, winSemi2], true)}
				</div>
			</div>
		);
	};

	return (
		<div className="p-4 space-y-8 bg-gray-900/50 rounded-2xl border border-white/5">
			<div className="flex flex-col xl:flex-row gap-10">
				{renderConfColumn('West')}
				<div className="hidden xl:block w-px bg-white/10 self-stretch"></div>
				{renderConfColumn('East')}
			</div>

			<div className="mt-8 pt-8 border-t border-white/10">
				<div className="max-w-md mx-auto mb-10">
					<p className="text-[10px] font-black text-orange-500 uppercase text-center mb-3 tracking-[0.3em] italic">NBA Finals Championship</p>
					{renderMatchRow("WORLD CHAMPION", "nba_finals", [results["w_conf_final"]?.winner, results["e_conf_final"]?.winner], true)}
				</div>

				<button
					onClick={saveAllToDatabase}
					disabled={loading || !hasChanges}
					className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-sm transition-all shadow-2xl ${
						!hasChanges 
							? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
							: 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_30px_rgba(22,163,74,0.4)] hover:scale-[1.01] active:scale-95'
					}`}
				>
					{loading ? 'SYNCING DATABASE...' : hasChanges ? '💾 Push Official Results to DB' : '✓ ALL RESULTS SYNCED'}
				</button>
			</div>
		</div>
	);
}