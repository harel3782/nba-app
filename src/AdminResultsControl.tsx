import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { NBA_TEAMS } from './teams';

// List of all bracket stages to report
const STAGES = [
	{ id: 'w_pi_7v8', label: 'West Play-In (7v8)' },
	{ id: 'w_pi_9v10', label: 'West Play-In (9v10)' },
	{ id: 'w_pi_8th', label: 'West Play-In (8th Seed)' },
	{ id: 'e_pi_7v8', label: 'East Play-In (7v8)' },
	{ id: 'e_pi_9v10', label: 'East Play-In (9v10)' },
	{ id: 'e_pi_8th', label: 'East Play-In (8th Seed)' },

	{ id: 'w_r1_1', label: 'West R1 (1vs8)' },
	{ id: 'w_r1_2', label: 'West R1 (2vs7)' },
	{ id: 'w_r1_3', label: 'West R1 (3vs6)' },
	{ id: 'w_r1_4', label: 'West R1 (4vs5)' },

	{ id: 'e_r1_1', label: 'East R1 (1vs8)' },
	{ id: 'e_r1_2', label: 'East R1 (2vs7)' },
	{ id: 'e_r1_3', label: 'East R1 (3vs6)' },
	{ id: 'e_r1_4', label: 'East R1 (4vs5)' },

	{ id: 'w_semis_1', label: 'West Semis 1' },
	{ id: 'w_semis_2', label: 'West Semis 2' },
	{ id: 'e_semis_1', label: 'East Semis 1' },
	{ id: 'e_semis_2', label: 'East Semis 2' },

	{ id: 'w_finals', label: 'West Finals' },
	{ id: 'e_finals', label: 'East Finals' },
	{ id: 'nba_finals', label: 'NBA Finals' },
];

export function AdminResultsControl() {
	const [results, setResults] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		loadResults();
	}, []);

	async function loadResults() {
		const { data } = await supabase.from('official_playoff_results').select('*');
		if (data) {
			const map: Record<string, string> = {};
			data.forEach((row) => (map[row.match_id] = row.winning_team_id));
			setResults(map);
		}
	}

	async function setWinner(matchId: string, teamId: string) {
		setLoading(true);
		// 1. Update DB
		const { error } = await supabase
			.from('official_playoff_results')
			.upsert({ match_id: matchId, winning_team_id: teamId }, { onConflict: 'match_id' });

		if (!error) {
			setResults((prev) => ({ ...prev, [matchId]: teamId }));
			// In future, add call to function that recalculates everyone's scores
		}
		setLoading(false);
	}

	return (
		<div className="bg-gray-900 p-6 rounded-xl border border-gray-700 max-w-4xl mx-auto my-8">
			<h2 className="text-2xl text-white font-bold mb-6 border-b border-gray-700 pb-2">
				👮 Admin: Set Real Results
			</h2>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{STAGES.map((stage) => {
					const currentWinner = NBA_TEAMS.find((t) => t.id === results[stage.id]);

					return (
						<div
							key={stage.id}
							className="bg-black/40 p-3 rounded border border-gray-700"
						>
							<div className="text-xs text-gray-400 uppercase mb-2">
								{stage.label}
							</div>

							<select
								className="w-full bg-gray-800 text-white text-sm p-2 rounded border border-gray-600 focus:border-blue-500 outline-none"
								value={results[stage.id] || ''}
								onChange={(e) => setWinner(stage.id, e.target.value)}
								disabled={loading}
							>
								<option value="">-- Select Winner --</option>
								{NBA_TEAMS.map((team) => (
									<option key={team.id} value={team.id}>
										{team.name}
									</option>
								))}
							</select>

							{currentWinner && (
								<div className="mt-2 flex items-center gap-2 text-green-400 text-xs">
									<span>✅ Winner:</span>
									<img src={currentWinner.logo} className="w-4 h-4" />
									<span className="font-bold">{currentWinner.name}</span>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
