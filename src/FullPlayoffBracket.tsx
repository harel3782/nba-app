import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';
import { NBA_TEAMS } from './teams'; // Source of truth for logos

interface Props {
	userId: string;
	leagueId: string;
	isLocked: boolean;
	onSave: () => void;
}

export function FullPlayoffBracket({ userId, leagueId, isLocked, onSave }: Props) {
	const [predictions, setPredictions] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [zoom, setZoom] = useState(0.75); // Slightly smaller base zoom to fit more

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

		// Cascade Reset: If you change an early winner, it clears their path forward
		const stages = ['playin', 'first_round', 'conf_semis', 'conf_finals', 'finals', 'champion'];
		const currentIdx = stages.indexOf(stageId);
		
		for (let i = currentIdx + 1; i < stages.length; i++) {
			Object.keys(newPredictions).forEach(key => {
				if (key.startsWith(stages[i])) delete newPredictions[key];
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

	const renderMatchup = (stageId: string, gameIndex: number, teamAId: string | null, teamBId: string | null, width = "w-48") => {
		const winnerId = predictions[`${stageId}_${gameIndex}`];
		const teamA = teamAId ? getTeam(teamAId) : null;
		const teamB = teamBId ? getTeam(teamBId) : null;

		return (
			<div className={`flex flex-col gap-[1px] ${width} bg-black/60 border border-white/10 rounded-lg overflow-hidden shadow-xl z-10`}>
				{[teamA, teamB].map((team, idx) => (
					<button
						key={idx}
						disabled={isLocked || !team}
						onClick={() => team && handleWinnerSelect(stageId, gameIndex, team.id)}
						className={`flex items-center justify-between px-3 py-2.5 transition-all ${
							winnerId === team?.id && team 
								? 'bg-orange-500/20 text-orange-400' 
								: 'hover:bg-white/5 text-gray-400'
						} ${!team ? 'opacity-20' : ''}`}
					>
						<div className="flex items-center gap-2">
							<img src={team?.logo || ''} alt="" className={`w-6 h-6 object-contain ${!team ? 'hidden' : ''}`} />
							{!team && <div className="w-6 h-6 rounded-full bg-white/5" />}
							<span className="text-[10px] font-black uppercase tracking-tighter truncate">
								{team ? team.name.split(' ').pop() : 'TBD'}
							</span>
						</div>
						{winnerId === team?.id && team && <span className="text-[8px] font-bold text-orange-500">★</span>}
					</button>
				))}
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center font-black text-orange-500 animate-pulse">LOADING NBA BRACKET...</div>;

	return (
		<div className="w-full min-h-screen flex flex-col items-center bg-[#0a0f1a] text-white">
			
			{/* PLAY-IN TOURNAMENT SECTION (Top Header) */}
			<div className="w-full max-w-[1200px] mt-8 mb-4 px-4 py-6 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md">
				<div className="text-[10px] font-black text-center uppercase tracking-[0.5em] mb-6 text-gray-500">SoFi NBA Play-In Tournament</div>
				<div className="flex justify-around items-center gap-4">
					<div className="flex flex-col items-center gap-2">
						<span className="text-[8px] font-bold text-blue-400 uppercase italic">West 7/8</span>
						{renderMatchup('playin', 0, 'PHX', 'GSW', 'w-40')}
					</div>
					<div className="flex flex-col items-center gap-2">
						<span className="text-[8px] font-bold text-blue-400 uppercase italic">West 9/10</span>
						{renderMatchup('playin', 1, 'SAC', 'NOP', 'w-40')}
					</div>
					<div className="h-10 w-[1px] bg-white/10 mx-4" />
					<div className="flex flex-col items-center gap-2">
						<span className="text-[8px] font-bold text-red-400 uppercase italic">East 7/8</span>
						{renderMatchup('playin', 2, 'MIA', 'PHI', 'w-40')}
					</div>
					<div className="flex flex-col items-center gap-2">
						<span className="text-[8px] font-bold text-red-400 uppercase italic">East 9/10</span>
						{renderMatchup('playin', 3, 'CHI', 'ATL', 'w-40')}
					</div>
				</div>
			</div>

			{/* FULL BRACKET CANVAS */}
			<div className="w-full overflow-x-auto no-scrollbar py-10 flex justify-center">
				<motion.div 
					className="flex items-center gap-10 min-w-[1600px] justify-center"
					animate={{ scale: zoom }}
				>
					{/* WEST: First Round & Semis */}
					<div className="flex gap-8 items-center">
						<div className="space-y-8">
							<div className="text-[9px] font-black text-center text-blue-500/40 uppercase mb-2">First Round</div>
							{renderMatchup('first_round', 0, 'OKC', predictions['playin_0'] || null)}
							{renderMatchup('first_round', 1, 'LAC', 'DAL')}
							{renderMatchup('first_round', 2, 'MIN', 'PHX')}
							{renderMatchup('first_round', 3, 'DEN', 'LAL')}
						</div>
						<div className="space-y-40">
							<div className="text-[9px] font-black text-center text-blue-500/40 uppercase mb-2">Conf Semis</div>
							{renderMatchup('conf_semis', 0, predictions['first_round_0'], predictions['first_round_1'])}
							{renderMatchup('conf_semis', 1, predictions['first_round_2'], predictions['first_round_3'])}
						</div>
						<div className="pt-10">
							<div className="text-[9px] font-black text-center text-blue-500/40 uppercase mb-2">W. Finals</div>
							{renderMatchup('conf_finals', 0, predictions['conf_semis_0'], predictions['conf_semis_1'])}
						</div>
					</div>

					{/* CENTER: NBA FINALS & CHAMPION */}
					<div className="flex flex-col items-center gap-12 px-10">
						<div className="text-center">
							<div className="px-4 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-[10px] font-black text-orange-500 uppercase tracking-widest mb-6 italic">NBA FINALS</div>
							{renderMatchup('finals', 0, predictions['conf_finals_0'], predictions['conf_finals_1'], 'w-56')}
						</div>
						<div className="flex flex-col items-center">
							<div className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4">World Champion</div>
							<div 
								onClick={() => !isLocked && predictions['finals_0'] && handleWinnerSelect('champion', 0, predictions['finals_0'])}
								className={`w-48 h-48 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer relative ${
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

					{/* EAST: First Round & Semis */}
					<div className="flex gap-8 items-center flex-row-reverse">
						<div className="space-y-8">
							<div className="text-[9px] font-black text-center text-red-500/40 uppercase mb-2">First Round</div>
							{renderMatchup('first_round', 4, 'BOS', predictions['playin_2'] || null)}
							{renderMatchup('first_round', 5, 'CLE', 'ORL')}
							{renderMatchup('first_round', 6, 'MIL', 'IND')}
							{renderMatchup('first_round', 7, 'NYK', 'PHI')}
						</div>
						<div className="space-y-40">
							<div className="text-[9px] font-black text-center text-red-500/40 uppercase mb-2">Conf Semis</div>
							{renderMatchup('conf_semis', 2, predictions['first_round_4'], predictions['first_round_5'])}
							{renderMatchup('conf_semis', 3, predictions['first_round_6'], predictions['first_round_7'])}
						</div>
						<div className="pt-10">
							<div className="text-[9px] font-black text-center text-red-500/40 uppercase mb-2">E. Finals</div>
							{renderMatchup('conf_finals', 1, predictions['conf_semis_2'], predictions['conf_semis_3'])}
						</div>
					</div>
				</motion.div>
			</div>

			{/* BOTTOM CONTROLS */}
			<div className="fixed bottom-6 flex items-center gap-4 bg-black/80 backdrop-blur-2xl border border-white/10 px-6 py-3 rounded-2xl shadow-2xl z-[100]">
				<button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} className="text-xl font-bold px-3">−</button>
				<span className="text-[10px] font-black uppercase text-gray-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
				<button onClick={() => setZoom(z => Math.min(z + 0.1, 1.2))} className="text-xl font-bold px-3">+</button>
				<div className="h-6 w-[1px] bg-white/10 mx-2" />
				<button 
					onClick={handleSave} 
					disabled={isLocked || loading} 
					className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
				>
					{loading ? 'SAVING...' : 'SAVE BRACKET'}
				</button>
			</div>
		</div>
	);
}