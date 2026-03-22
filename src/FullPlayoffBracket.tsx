import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { NBA_TEAMS } from './teams';

interface Props {
	userId: string;
	leagueId: string;
	isLocked: boolean;
	onSave: () => void;
}

export function FullPlayoffBracket({ userId, leagueId, isLocked, onSave }: Props) {
	const [predictions, setPredictions] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);

	// Fetch team data from your central teams.ts file
	const getTeam = (id: string) => NBA_TEAMS.find(t => t.id === id);

	useEffect(() => {
		fetchPredictions();
	}, [userId, leagueId]);

	async function fetchPredictions() {
		try {
			const { data, error } = await supabase
				.from('tournament_predictions')
				.select('selection_data')
				.eq('user_id', userId)
				.eq('league_id', leagueId)
				.maybeSingle();

			if (error) throw error;
			if (data?.selection_data) setPredictions(data.selection_data);
		} catch (err) {
			console.error('Error fetching bracket:', err);
		} finally {
			setLoading(false);
		}
	}

	const handleWinnerSelect = (stageId: string, gameIndex: number, teamId: string) => {
		if (isLocked) return;
		const newPredictions = { ...predictions };
		newPredictions[`${stageId}_${gameIndex}`] = teamId;

		// Simple logic to clear forward path if a winner is changed early
		const sequence = ['first_round', 'conf_semis', 'conf_finals', 'finals', 'champion'];
		const startIdx = sequence.indexOf(stageId);
		for (let i = startIdx + 1; i < sequence.length; i++) {
			Object.keys(newPredictions).forEach(key => {
				if (key.startsWith(sequence[i])) delete newPredictions[key];
			});
		}
		setPredictions(newPredictions);
	};

	const handleSave = async () => {
		setLoading(true);
		try {
			const { error } = await supabase
				.from('tournament_predictions')
				.upsert({
					user_id: userId,
					league_id: leagueId,
					selection_data: predictions,
					updated_at: new Date().toISOString()
				});
			if (error) throw error;
			onSave();
		} catch (err) {
			console.error('Save error:', err);
		} finally {
			setLoading(false);
		}
	};

	const renderMatchup = (stageId: string, gameIndex: number, teamAId: string | null, teamBId: string | null) => {
		const winnerId = predictions[`${stageId}_${gameIndex}`];
		const teamA = teamAId ? getTeam(teamAId) : null;
		const teamB = teamBId ? getTeam(teamBId) : null;

		return (
			<div className="flex flex-col gap-[1px] w-40 bg-black/60 border border-white/10 rounded-lg overflow-hidden shadow-lg">
				{[teamA, teamB].map((team, idx) => (
					<button
						key={idx}
						disabled={isLocked || !team}
						onClick={() => team && handleWinnerSelect(stageId, gameIndex, team.id)}
						className={`flex items-center justify-between px-3 py-2 transition-all ${
							winnerId === team?.id && team 
								? 'bg-orange-600 text-white' 
								: 'hover:bg-white/5 text-gray-400'
						} ${!team ? 'opacity-20' : ''}`}
					>
						<div className="flex items-center gap-2">
							{team ? (
								<img src={team.logo} alt="" className="w-5 h-5 object-contain" />
							) : (
								<div className="w-5 h-5 rounded-full bg-white/5" />
							)}
							<span className="text-[10px] font-black uppercase tracking-tighter truncate w-16 text-left">
								{team ? team.name.split(' ').pop() : 'TBD'}
							</span>
						</div>
						{winnerId === team?.id && team && <span className="text-[8px]">●</span>}
					</button>
				))}
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center font-black text-orange-500 animate-pulse">LOADING...</div>;

	return (
		<div className="w-full flex flex-col items-center bg-[#0a0f1a] py-10 px-4">
			
			<div className="flex items-center justify-center gap-6 w-full max-w-7xl">
				
				{/* WEST CONFERENCE */}
				<div className="flex items-center gap-6">
					<div className="flex flex-col gap-4">
						<span className="text-[8px] font-black text-blue-500/40 uppercase text-center mb-1">First Round</span>
						{renderMatchup('first_round', 0, 'OKC', 'NOP')}
						{renderMatchup('first_round', 1, 'LAC', 'DAL')}
						{renderMatchup('first_round', 2, 'MIN', 'PHX')}
						{renderMatchup('first_round', 3, 'DEN', 'LAL')}
					</div>
					<div className="flex flex-col gap-28">
						<span className="text-[8px] font-black text-blue-500/40 uppercase text-center mb-1">Semis</span>
						{renderMatchup('conf_semis', 0, predictions['first_round_0'], predictions['first_round_1'])}
						{renderMatchup('conf_semis', 1, predictions['first_round_2'], predictions['first_round_3'])}
					</div>
					<div className="flex flex-col">
						<span className="text-[8px] font-black text-blue-500/40 uppercase text-center mb-1">Finals</span>
						{renderMatchup('conf_finals', 0, predictions['conf_semis_0'], predictions['conf_semis_1'])}
					</div>
				</div>

				{/* NBA FINALS CENTERPIECE */}
				<div className="flex flex-col items-center gap-12 px-2">
					<div className="text-center">
						<div className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-4">NBA Finals</div>
						{renderMatchup('finals', 0, predictions['conf_finals_0'], predictions['conf_finals_1'])}
					</div>
					<div className="flex flex-col items-center">
						<div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-4">Champion</div>
						<div 
							onClick={() => !isLocked && predictions['finals_0'] && handleWinnerSelect('champion', 0, predictions['finals_0'])}
							className={`w-36 h-36 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer ${
								predictions['champion_0'] 
									? 'border-yellow-500 bg-yellow-500/5 shadow-2xl' 
									: 'border-white/10 bg-black/40'
							}`}
						>
							{predictions['champion_0'] ? (
								<img src={getTeam(predictions['champion_0'])?.logo} alt="" className="w-24 h-24 object-contain" />
							) : (
								<span className="text-4xl opacity-10">🏆</span>
							)}
						</div>
					</div>
				</div>

				{/* EAST CONFERENCE */}
				<div className="flex items-center gap-6 flex-row-reverse">
					<div className="flex flex-col gap-4">
						<span className="text-[8px] font-black text-red-500/40 uppercase text-center mb-1">First Round</span>
						{renderMatchup('first_round', 4, 'BOS', 'MIA')}
						{renderMatchup('first_round', 5, 'CLE', 'ORL')}
						{renderMatchup('first_round', 6, 'MIL', 'IND')}
						{renderMatchup('first_round', 7, 'NYK', 'PHI')}
					</div>
					<div className="flex flex-col gap-28">
						<span className="text-[8px] font-black text-red-500/40 uppercase text-center mb-1">Semis</span>
						{renderMatchup('conf_semis', 2, predictions['first_round_4'], predictions['first_round_5'])}
						{renderMatchup('conf_semis', 3, predictions['first_round_6'], predictions['first_round_7'])}
					</div>
					<div className="flex flex-col">
						<span className="text-[8px] font-black text-red-500/40 uppercase text-center mb-1">Finals</span>
						{renderMatchup('conf_finals', 1, predictions['conf_semis_2'], predictions['conf_semis_3'])}
					</div>
				</div>

			</div>

			<div className="mt-12 flex justify-center">
				<button 
					onClick={handleSave} 
					disabled={isLocked || loading} 
					className="bg-orange-600 hover:bg-orange-500 text-white px-16 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl transition-all disabled:opacity-50"
				>
					{loading ? 'SAVING...' : 'SAVE BRACKET'}
				</button>
			</div>
		</div>
	);
}