import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function AdminStandingsMonitor() {
	const [standings, setStandings] = useState<any[]>([]);

	const fetchStandings = async () => {
		// Fetch from the official standings table
		const { data } = await supabase
			.from('official_regular_standings')
			.select('team_id, wins, losses, actual_rank, conference')
			.order('conference', { ascending: false })
			.order('actual_rank', { ascending: true });
		if (data) setStandings(data);
	};

	useEffect(() => { fetchStandings(); }, []);

	const renderConf = (conf: string) => (
		<div className="flex-1 bg-black/40 p-4 rounded-xl border border-white/5">
			<h4 className="text-xs font-black mb-3 uppercase tracking-widest text-gray-500">{conf} Conference</h4>
			<div className="space-y-1">
				{standings.filter(s => s.conference === conf).map(s => (
					<div key={s.team_id} className="flex justify-between text-[10px] font-mono border-b border-white/5 pb-1">
						<span>{s.actual_rank}. {s.team_id}</span>
						<span className="text-orange-400">{s.wins}-{s.losses}</span>
					</div>
				))}
			</div>
		</div>
	);

	return (
		<div className="space-y-4">
			<div className="flex gap-4">
				{renderConf('West')}
				{renderConf('East')}
			</div>
			<button onClick={fetchStandings} className="text-[10px] bg-white/5 hover:bg-white/10 px-3 py-1 rounded">🔄 Refresh Live Data</button>
		</div>
	);
}