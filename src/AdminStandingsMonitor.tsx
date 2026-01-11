import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { NBA_TEAMS } from './teams';

export function AdminStandingsMonitor() {
	const [standings, setStandings] = useState<any[]>([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchStandings();
	}, []);

	async function fetchStandings() {
		setLoading(true);
		// Direct fetch from the source-of-truth table
		const { data } = await supabase
			.from('official_standings')
			.select('*')
			.order('rank', { ascending: true });

		if (data) setStandings(data);
		setLoading(false);
	}

	const renderConf = (conf: 'West' | 'East') => {
		const confTeams = standings.filter(s => s.conference === conf);
		
		return (
			<div className="bg-black/30 rounded-lg p-4 border border-white/10">
				<h4 className={`text-lg font-bold mb-3 uppercase ${conf === 'West' ? 'text-blue-400' : 'text-red-400'}`}>
					{conf} (Live from DB)
				</h4>
				{confTeams.length === 0 ? (
					<div className="text-gray-500 text-sm">No data from script yet...</div>
				) : (
					<div className="space-y-1">
						{confTeams.map((row) => {
							// Attempt to find the team in the config file to show logo and nice name
							// If not found - script probably wrote an incorrect ID!
							const teamConfig = NBA_TEAMS.find(t => t.id === row.team_id);
							const isMatch = !!teamConfig;

							return (
								<div key={row.team_id} className={`flex items-center gap-3 text-sm p-1.5 rounded ${isMatch ? 'bg-white/5' : 'bg-red-900/50 border border-red-500'}`}>
									<span className="w-6 text-right font-mono text-gray-400">#{row.rank}</span>
									{teamConfig ? (
										<>
											<img src={teamConfig.logo} className="w-5 h-5 object-contain" />
											<span className="text-white">{teamConfig.name}</span>
										</>
									) : (
										<span className="text-red-300 font-bold">⚠️ Unknown ID: {row.team_id}</span>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>
		);
	};

	if (loading) return <div className="text-xs text-gray-500">Checking DB...</div>;

	return (
		<div className="w-full">
			<div className="flex justify-between items-center mb-4">
				<p className="text-xs text-gray-400">
					These are the standings currently stored in <code>official_standings</code> table.
					<br/>Updated automatically by your external script.
				</p>
				<button onClick={fetchStandings} className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded">
					🔄 Refresh
				</button>
			</div>
			
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{renderConf('West')}
				{renderConf('East')}
			</div>
		</div>
	);
}