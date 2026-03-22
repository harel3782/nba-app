import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
	const [zoom, setZoom] = useState(0.8);

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

		// Tree logic: Clearing the path forward if a winner changes
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

	const renderMatchup = (stageId: string, gameIndex: number, teamAId: string | null, teamBId: string | null, type: 'left' | 'right' | 'center' = 'left') => {
		const winnerId = predictions[`${stageId}_${gameIndex}`];
		const teamA = teamAId ? getTeam(teamAId) : null;
		const teamB = teamBId ? getTeam(teamBId) : null;

		// CSS classes for the connecting lines based on bracket side
		const lineClass = "absolute top-1/2 w-8 h-[2px] bg-white/20";
		const connector = type === 'left' ? `${lineClass} -right-8` : type === 'right' ? `${lineClass} -left-8` : "";

		return (
			<div className="relative flex flex-col items-center">
				<div className="flex flex-col gap-[1px] w-44 bg-black/60 border border-white/10 rounded-lg overflow-hidden shadow-xl z-20">
					{[teamA, teamB].map((team, idx) => (
						<button
							key={idx}
							disabled={isLocked || !team}
							onClick={() => team && handleWinnerSelect(stageId, gameIndex, team.id)}
							className={`flex items-center justify-between px-3 py-2 transition-all ${
								winnerId === team?.id && team 
									? 'bg-orange-500/30 text-white' 
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
							{winnerId === team?.id && team && <span className="text-orange-500 text-[10px]">●</span>}
						</button>
					))}
				</div>
				{stageId !== 'finals' && <div className={connector} />}
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center font-black text-orange-500">LOADING...</div>;

	return (
		<div className="w-full h-[90vh] flex flex-col items-center justify-center bg-[#0a0f1a] overflow-hidden relative">
			
			<motion.div 
				className="flex items-center justify-center gap-8 w-full max-w-[1600px] h-full"
				animate={{ scale: zoom }}
			>
				{/* WEST CONFERENCE */}
				<div className="flex items-center gap-8">
					{/* First Round */}
					<div className="flex flex-col gap-6">
						<span className="text-[8px] font-black text-blue-500/40 uppercase text-center mb-2">First Round</span>
						{renderMatchup('first_round', 0, 'OKC', 'NOP', 'left')}
						{renderMatchup('first_round', 1, 'LAC', 'DAL', 'left')}
						{renderMatchup('first_round', 2, 'MIN', 'PHX', 'left')}
						{renderMatchup('first_round', 3, 'DEN', 'LAL', 'left')}
					</div>
					{/* Semis */}
					<div className="flex flex-col gap-32">
						<span className="text-[8px] font-black text-blue-500/40 uppercase text-center mb-2">Semis</span>
						{renderMatchup('conf_semis', 0, predictions['first_round_0'], predictions['first_round_1'], 'left')}
						{renderMatchup('conf_semis', 1, predictions['first_round_2'], predictions['first_round_3'], 'left')}
					</div>
					{/* W. Finals */}
					<div className="flex flex-col">
						<span className="text-[8px] font-black text-blue-500/40 uppercase text-center mb-2">Finals</span>
						{renderMatchup('conf_finals', 0, predictions['conf_semis_0'], predictions['conf_semis_1'], 'left')}
					</div>
				</div>

				{/* CENTER: NBA FINALS & CHAMPION */}
				<div className="flex flex-col items-center gap-12 px-4 z-50">
					<div className="text-center">
						<div className="inline-block px-4 py-1 rounded-full border border-orange-500/30 bg-orange-500/5 text-[9px] font-black text-orange-500 uppercase tracking-[0.4em] mb-4">NBA Finals</div>
						{renderMatchup('finals', 0, predictions['conf_finals_0'], predictions['conf_finals_1'], 'center')}
					</div>
					
					<div className="flex flex-col items-center">
						<div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-4">Champion</div>
						<div 
							onClick={() => !isLocked && predictions['finals_0'] && handleWinnerSelect('champion', 0, predictions['finals_0'])}
							className={`w-44 h-44 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer relative ${
								predictions['champion_0'] 
									? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_60px_rgba(234,179,8,0.2)]' 
									: 'border-white/10 bg-black/40 hover:border-white/20'
							}`}
						>
							{predictions['champion_0'] ? (
								<>
									<img src={getTeam(predictions['champion_0'])?.logo} alt="" className="w-28 h-28 object-contain z-10 animate-pulse" />
									<div className="absolute inset-0 bg-yellow-500/10 blur-3xl rounded-full" />
								</>
							) : (
								<span className="text-5xl opacity-10">🏆</span>
							)}
						</div>
					</div>
				</div>

				{/* EAST CONFERENCE */}
				<div className="flex items-center gap-8 flex-row-reverse">
					{/* First Round */}
					<div className="flex flex-col gap-6">
						<span className="text-[8px] font-black text-red-500/40 uppercase text-center mb-2">First Round</span>
						{renderMatchup('first_round', 4, 'BOS', 'MIA', 'right')}
						{renderMatchup('first_round', 5, 'CLE', 'ORL', 'right')}
						{renderMatchup('first_round', 6, 'MIL', 'IND', 'right')}
						{renderMatchup('first_round', 7, 'NYK', 'PHI', 'right')}
					</div>
					{/* Semis */}
					<div className="flex flex-col gap-32">
						<span className="text-[8px] font-black text-red-500/40 uppercase text-center mb-2">Semis</span>
						{renderMatchup('conf_semis', 2, predictions['first_round_4'], predictions['first_round_5'], 'right')}
						{renderMatchup('conf_semis', 3, predictions['first_round_6'], predictions['first_round_7'], 'right')}
					</div>
					{/* E. Finals */}
					<div className="flex flex-col">
						<span className="text-[8px] font-black text-red-500/40 uppercase text-center mb-2">Finals</span>
						{renderMatchup('conf_finals', 1, predictions['conf_semis_2'], predictions['conf_semis_3'], 'right')}
					</div>
				</div>
			</motion.div>

			{/* CONTROLS */}
			<div className="absolute bottom-6 flex items-center gap-6 bg-black/80 backdrop-blur-xl border border-white/10 px-6 py-3 rounded-2xl">
				<div className="flex items-center gap-3">
					<button onClick={() => setZoom(z => Math.max(z - 0.05, 0.4))} className="text-white opacity-50 hover:opacity-100">−</button>
					<span className="text-[10px] font-black w-8 text-center text-gray-500">{Math.round(zoom * 100)}%</span>
					<button onClick={() => setZoom(z => Math.min(z + 0.05, 1.2))} className="text-white opacity-50 hover:opacity-100">+</button>
				</div>
				<button 
					onClick={handleSave} 
					disabled={isLocked || loading} 
					className="bg-orange-600 hover:bg-orange-500 text-white px-10 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all"
				>
					{loading ? '...' : 'SAVE BRACKET'}
				</button>
			</div>
		</div>
	);
}