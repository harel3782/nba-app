import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';
import { NBA_TEAMS } from './teams'; // Using your source of truth

interface Props {
	userId: string;
	leagueId: string;
	isLocked: boolean;
	onSave: () => void;
}

export function FullPlayoffBracket({ userId, leagueId, isLocked, onSave }: Props) {
	const [predictions, setPredictions] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [zoom, setZoom] = useState(0.9);

	// Helper to get the exact team object from your teams.ts
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

		// Reset logic for subsequent rounds
		if (stageId === 'conf_semis') {
			const nextGame = Math.floor(gameIndex / 2);
			delete newPredictions[`conf_finals_${nextGame}`];
			delete newPredictions[`finals_0`];
			delete newPredictions[`champion_0`];
		} else if (stageId === 'conf_finals') {
			delete newPredictions[`finals_0`];
			delete newPredictions[`champion_0` ];
		} else if (stageId === 'finals') {
			delete newPredictions[`champion_0`];
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
			console.error('Error saving bracket:', err);
		} finally {
			setLoading(false);
		}
	};

	const renderMatchup = (stageId: string, gameIndex: number, teamAId: string | null, teamBId: string | null) => {
		const winnerId = predictions[`${stageId}_${gameIndex}`];
		const teamA = teamAId ? getTeam(teamAId) : null;
		const teamB = teamBId ? getTeam(teamBId) : null;

		return (
			<div className="flex flex-col gap-1 w-60 bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-md z-10">
				{[teamA, teamB].map((team, idx) => (
					<button
						key={idx}
						disabled={isLocked || !team}
						onClick={() => team && handleWinnerSelect(stageId, gameIndex, team.id)}
						className={`flex items-center justify-between px-4 py-3 transition-all ${
							winnerId === team?.id && team 
								? 'bg-orange-500/20 text-orange-400' 
								: 'hover:bg-white/5 text-gray-400'
						} ${!team ? 'opacity-20' : ''}`}
					>
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 flex items-center justify-center">
								{team ? (
									<img src={team.logo} alt="" className="w-full h-full object-contain" />
								) : (
									<div className="w-5 h-5 rounded-full border border-white/5 bg-white/5" />
								)}
							</div>
							<span className="text-xs font-black uppercase tracking-widest truncate max-w-[100px]">
								{team ? team.name.split(' ').pop() : 'TBD'}
							</span>
						</div>
						{winnerId === team?.id && team && (
							<span className="text-[9px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-black italic">WIN</span>
						)}
					</button>
				))}
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center animate-pulse text-orange-500 font-black">LOADING BRACKET...</div>;

	return (
		<div className="w-full min-h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
			{/* SVG BRACKET LINES - The classic "tree" look */}
			<svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" preserveAspectRatio="none">
				<defs>
					<linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
						<stop offset="0%" stopColor="white" stopOpacity="0" />
						<stop offset="50%" stopColor="white" stopOpacity="1" />
						<stop offset="100%" stopColor="white" stopOpacity="0" />
					</linearGradient>
				</defs>
				{/* West Connectors */}
				<path d="M 320 180 L 380 180 L 380 340 L 440 340" fill="none" stroke="url(#lineGrad)" strokeWidth="2" />
				<path d="M 320 500 L 380 500 L 380 340 L 440 340" fill="none" stroke="url(#lineGrad)" strokeWidth="2" />
				{/* East Connectors */}
				<path d="M 1080 180 L 1020 180 L 1020 340 L 960 340" fill="none" stroke="url(#lineGrad)" strokeWidth="2" />
				<path d="M 1080 500 L 1020 500 L 1020 340 L 960 340" fill="none" stroke="url(#lineGrad)" strokeWidth="2" />
			</svg>

			<motion.div 
				className="flex justify-between items-center w-full max-w-[1400px] px-8 py-10"
				style={{ scale: zoom }}
			>
				{/* WEST CONFERENCE */}
				<div className="flex gap-16 items-center">
					<div className="space-y-32">
						<div className="text-[10px] font-black text-blue-400/30 uppercase tracking-[0.5em] text-center mb-4">West Semis</div>
						{renderMatchup('conf_semis', 0, 'OKC', 'DAL')}
						{renderMatchup('conf_semis', 1, 'DEN', 'MIN')}
					</div>
					<div className="pt-20">
						<div className="text-[10px] font-black text-blue-400/30 uppercase tracking-[0.5em] text-center mb-4">Finals</div>
						{renderMatchup('conf_finals', 0, predictions['conf_semis_0'], predictions['conf_semis_1'])}
					</div>
				</div>

				{/* NBA FINALS CENTERPIECE */}
				<div className="flex flex-col items-center gap-16">
					<div className="text-center">
						<div className="inline-block px-6 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/5 text-[10px] font-black text-orange-400 uppercase tracking-[0.6em] mb-8">NBA FINALS</div>
						{renderMatchup('finals', 0, predictions['conf_finals_0'], predictions['conf_finals_1'])}
					</div>
					
					<div className="flex flex-col items-center">
						<div className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] mb-4">Champion</div>
						<motion.div 
							whileTap={{ scale: 0.95 }}
							onClick={() => !isLocked && predictions['finals_0'] && handleWinnerSelect('champion', 0, predictions['finals_0'])}
							className={`w-52 h-52 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer relative ${
								predictions['champion_0'] 
									? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_80px_rgba(234,179,8,0.2)]' 
									: 'border-white/10 bg-black/40'
							}`}
						>
							{predictions['champion_0'] ? (
								<>
									<img src={getTeam(predictions['champion_0'])?.logo} alt="" className="w-32 h-32 object-contain z-10" />
									<div className="absolute inset-0 bg-yellow-500/10 blur-3xl rounded-full" />
								</>
							) : (
								<span className="text-6xl opacity-10">🏆</span>
							)}
						</motion.div>
					</div>
				</div>

				{/* EAST CONFERENCE */}
				<div className="flex gap-16 items-center flex-row-reverse">
					<div className="space-y-32">
						<div className="text-[10px] font-black text-red-500/30 uppercase tracking-[0.5em] text-center mb-4">East Semis</div>
						{renderMatchup('conf_semis', 2, 'BOS', 'CLE')}
						{renderMatchup('conf_semis', 3, 'NYK', 'IND')}
					</div>
					<div className="pt-20">
						<div className="text-[10px] font-black text-red-500/30 uppercase tracking-[0.5em] text-center mb-4">Finals</div>
						{renderMatchup('conf_finals', 1, predictions['conf_semis_2'], predictions['conf_semis_3'])}
					</div>
				</div>
			</motion.div>

			{/* DESKTOP/MOBILE SCALE TOGGLE */}
			<div className="fixed bottom-8 flex gap-4 bg-black/80 backdrop-blur-xl p-2 rounded-2xl border border-white/10 shadow-2xl z-[60]">
				<button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white font-bold hover:bg-white/10 transition-all">−</button>
				<button onClick={() => setZoom(0.9)} className="px-4 text-[10px] font-black uppercase text-gray-500 tracking-widest">Fit Bracket</button>
				<button onClick={() => setZoom(z => Math.min(z + 0.1, 1.2))} className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white font-bold hover:bg-white/10 transition-all">+</button>
				<button 
					onClick={handleSave} 
					disabled={isLocked || loading} 
					className="ml-4 bg-orange-600 hover:bg-orange-500 text-white px-8 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all"
				>
					{loading ? 'Saving...' : 'Save Bracket'}
				</button>
			</div>
		</div>
	);
}