import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Team {
	id: string;
	conference: string;
	actual_rank: number;
}

export function AdminResultsControl() {
	const [teams, setTeams] = useState<Team[]>([]);
	const [results, setResults] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);
	const [hasChanges, setHasChanges] = useState(false);

	useEffect(() => {
		fetchData();
	}, []);

	async function fetchData() {
		const { data: standings } = await supabase
			.from('actual_standings')
			.select('team_id, conference, actual_rank')
			.order('actual_rank', { ascending: true });

		const { data: official } = await supabase
			.from('official_playoff_results')
			.select('match_id, winning_team_id');

		if (standings) {
			setTeams(standings.map(t => ({
				id: t.team_id,
				conference: t.conference,
				actual_rank: parseInt(t.actual_rank.toString())
			})));
		}

		if (official) {
			const resultsMap: Record<string, string> = {};
			official.forEach((r) => {
				resultsMap[r.match_id] = r.winning_team_id;
			});
			setResults(resultsMap);
			setHasChanges(false);
		}
	}

	const handleLocalChange = (teamId: string, matchId: string) => {
		setResults(prev => ({ ...prev, [matchId]: teamId }));
		setHasChanges(true);
	};

	async function saveAllToDatabase() {
		setLoading(true);
		try {
			const rowsToUpsert = Object.entries(results).map(([matchId, teamId]) => ({
				match_id: matchId,
				winning_team_id: teamId
			}));

			if (rowsToUpsert.length > 0) {
				const { error } = await supabase
					.from('official_playoff_results')
					.upsert(rowsToUpsert, { onConflict: 'match_id' });

				if (error) throw error;
				
				await supabase.rpc('refresh_all_leaderboards');
				alert("✅ Results saved successfully!");
				setHasChanges(false);
			}
		} catch (err) {
			console.error("Save failed:", err);
		} finally {
			setLoading(false);
		}
	}

	const renderSelect = (label: string, matchId: string, options: (string | undefined)[], isSpecial = false) => {
		const validOptions = options.filter((id): id is string => !!id);
		const currentValue = results[matchId] || "";

		return (
			<div className={`flex items-center justify-between p-2 rounded border ${isSpecial ? 'bg-orange-500/10 border-orange-500/30' : 'bg-black/20 border-white/5'} mb-1`}>
				<span className="text-[8px] font-black uppercase text-gray-400 w-24 leading-none">{label}</span>
				<select 
					className="flex-1 bg-black/60 border border-white/10 py-1 px-2 rounded text-[10px] font-bold text-white outline-none focus:border-blue-500"
					value={currentValue}
					onChange={(e) => handleLocalChange(e.target.value, matchId)}
				>
					<option value="">Select...</option>
					{validOptions.map(id => (
						<option key={id} value={id}>{id}</option>
					))}
				</select>
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

		const winner7v8 = results[`${prefix}pi_7v8`];
		const winner8th = results[`${prefix}pi_8th`];
		
		const winR1_1 = results[`${prefix}r1_1vs8`];
		const winR1_4 = results[`${prefix}r1_4vs5`];
		const winR1_3 = results[`${prefix}r1_3vs6`];
		const winR1_2 = results[`${prefix}r1_2vs7`];

		const winSemi1 = results[`${prefix}semi_1`];
		const winSemi2 = results[`${prefix}semi_2`];

		return (
			<div className="flex-1 space-y-4">
				<h4 className={`text-xs font-black italic uppercase border-b-2 ${conf === 'West' ? 'border-blue-500 text-blue-400' : 'border-red-500 text-red-400'} pb-1`}>
					{conf}
				</h4>
				
				<div className="space-y-1">
					<p className="text-[7px] font-bold text-gray-500 uppercase mb-1">Play-In</p>
					{renderSelect("7 vs 8 Winner", `${prefix}pi_7v8`, [s7, s8])}
					{renderSelect("9 vs 10 Winner", `${prefix}pi_9v10`, [s9, s10])}
					{renderSelect("8th Seed Final", `${prefix}pi_8th`, [s7, s8, s9, s10], true)}
				</div>

				<div className="space-y-1">
					<p className="text-[7px] font-bold text-gray-500 uppercase mb-1 mt-3">First Round</p>
					{renderSelect("1 vs 8 Winner", `${prefix}r1_1vs8`, [s1, winner8th])}
					{renderSelect("4 vs 5 Winner", `${prefix}r1_4vs5`, [s4, s5])}
					{renderSelect("3 vs 6 Winner", `${prefix}r1_3vs6`, [s3, s6])}
					{renderSelect("2 vs 7 Winner", `${prefix}r1_2vs7`, [s2, winner7v8])}
				</div>

				<div className="space-y-1">
					<p className="text-[7px] font-bold text-gray-500 uppercase mb-1 mt-3">Advanced</p>
					{renderSelect("Semi 1 Winner", `${prefix}semi_1`, [winR1_1, winR1_4], true)}
					{renderSelect("Semi 2 Winner", `${prefix}semi_2`, [winR1_2, winR1_3], true)}
					{renderSelect("Conf Champ", `${prefix}conf_final`, [winSemi1, winSemi2], true)}
				</div>
			</div>
		);
	};

	return (
		<div className="p-2 space-y-6">
			<div className="flex flex-col md:flex-row gap-6">
				{renderConfColumn('West')}
				<div className="hidden md:block w-px bg-white/10 self-stretch"></div>
				{renderConfColumn('East')}
			</div>

			<div className="mt-4 pt-4 border-t border-white/10">
				<div className="max-w-xs mx-auto mb-6">
					<p className="text-[7px] font-black text-orange-500 uppercase text-center mb-1">NBA Finals</p>
					{renderSelect("NBA CHAMPION", "nba_finals", [results["w_conf_final"], results["e_conf_final"]], true)}
				</div>

				<button
					onClick={saveAllToDatabase}
					disabled={loading || !hasChanges}
					className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${
						!hasChanges 
							? 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50' 
							: 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:scale-[1.02]'
					}`}
				>
					{loading ? 'Processing....' : hasChanges ? 'Save Official Results' : 'System Up To Date'}
				</button>
			</div>
		</div>
	);
}