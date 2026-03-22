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
	const [zoom, setZoom] = useState(0.85);

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

		// Cascade reset for future rounds
		const path = ['first_round', 'conf_semis', 'conf_finals', 'finals', 'champion'];
		const currentStageIdx = path.indexOf(stageId);
		for (let i = currentStageIdx + 1; i < path.length; i++) {
			Object.keys(newPredictions).forEach(key => {
				if (key.startsWith(path[i])) delete newPredictions[key];
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

	// FIX: Added width as a 5th parameter to the definition to fix TS2554
	const renderMatchup = (stageId: string, gameIndex: number, teamAId: string | null, teamBId: string | null, width = "w-40") => {
		const winnerId = predictions[`${stageId}_${gameIndex}`];
		const teamA = teamAId ? getTeam(teamAId) : null;
		const teamB = teamBId ? getTeam(teamBId) : null;

		return (
			<div className={`flex flex-col gap-[2px] ${width} bg-black/60 border border-white/10 rounded-lg overflow-hidden shadow-xl z-20`}>
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
							<span className="text-[10px] font-black uppercase tracking-tighter truncate w-20 text-left">
								{team ? team.name.split(' ').pop() : 'TBD'}
							</span>
						</div>
						{winnerId === team?.id && team && <span className="text-orange-500 text-[10px]">●</span>}
					</button>
				))}
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center font-black text-orange-500">LOADING...</div>;

	return (
		<div className="w-full h-[85vh] flex flex-col items-center justify-center bg-[#0a0f1a] overflow-hidden p-4 relative">
			
			{/* SVG BRACKET LINES */}
			<svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
				<g fill="none" stroke="white" strokeWidth="1.5">
					{/* West Connections */}
					<path d="M 220 120 L 260 120 L 260 170 L 300 170" />
					<path d="M 220 220 L 260 220 L 260 170 L 300 170" />
					<path d="M 220 380 L 260 380 L 260 430 L 300 430" />
					<path d="M 220 480 L 260 480 L 260 430 L 300 430" />
					<path d="M 460 170 L 500 170 L 500 300 L 540 300" />
					<path d="M 460 430 L 500 430 L 500 300 L 540 300" />
					{/* East Connections */}
					<path d="M 1180 120 L 1140 120 L 1140 170 L 1100 170" />
					<path d="M 1180 220 L 1140 220 L 1140 170 L 1100 170" />
					<path d="M 1180 380 L 1140 380 L 1140 430 L 1100 430" />
					<path d="M 1180 480 L 1140 480 L 1140 430 L 1100 430" />
					<path d="M 940 170 L 900 170 L 900 300 L 860 300" />
					<path d="M 940 430 L 900 430 L 900 300 L 860 300" />
				</g>
			</svg>

			{/* FIX: Using motion.div to satisfy the 'motion' import error TS6133 */}
			<motion.div 
				className="flex items-center gap-10 w-full max-w-[1400px] h-full"
				animate={{ scale: zoom }}
			>
				{/* WEST */}
				<div className="flex items-center gap-12">
					<div className="flex flex-col gap-10">
						<span className="text-[8px] font-bold text-blue-500/50 uppercase text-center mb-2">First Round</span>
						{renderMatchup('first_round', 0, 'OKC', 'NOP')}
						{renderMatchup('first_round', 1, 'LAC', 'DAL')}
						{renderMatchup('first_round', 2, 'MIN', 'PHX')}
						{renderMatchup('first_round', 3, 'DEN', 'LAL')}
					</div>
					<div className="flex flex-col gap-36">
						<span className="text-[8px] font-bold text-blue-500/50 uppercase text-center mb-2">Semis</span>
						{renderMatchup('conf_semis', 0, predictions['first_round_0'], predictions['first_round_1'])}
						{renderMatchup('conf_semis', 1, predictions['first_round_2'], predictions['first_round_3'])}
					</div>
					<div>
						<span className="text-[8px] font-bold text-blue-500/50 uppercase text-center mb-2">Finals</span>
						{renderMatchup('conf_finals', 0, predictions['conf_semis_0'], predictions['conf_semis_1'])}
					</div>
				</div>

				{/* CENTER */}
				<div className="flex-1 flex flex-col items-center gap-12 pt-10">
					<div className="text-center">
						<div className="inline-block px-4 py-1 rounded-full border border-orange-500/30 bg-orange-500/5 text-[9px] font-black text-orange-500 uppercase tracking-[0.4em] mb-4 italic">The Finals</div>
						{renderMatchup('finals', 0, predictions['conf_finals_0'], predictions['conf_finals_1'], 'w-56')}
					</div>
					<div className="flex flex-col items-center">
						<div className="text-[9px] font-black text-yellow-500 uppercase tracking-widest mb-4">Champion</div>
						<div 
							onClick={() => !isLocked && predictions['finals_0'] && handleWinnerSelect('champion', 0, predictions['finals_0'])}
							className={`w-40 h-40 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer relative ${
								predictions['champion_0'] 
									? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_50px_rgba(234,179,8,0.2)]' 
									: 'border-white/10 bg-black/40 hover:border-white/20'
							}`}
						>
							{predictions['champion_0'] ? (
								<>
									<img src={getTeam(predictions['champion_0'])?.logo} alt="" className="w-24 h-24 object-contain z-10 animate-pulse" />
									<div className="absolute inset-0 bg-yellow-500/10 blur-3xl rounded-full" />
								</>
							) : (
								<span className="text-4xl opacity-10">🏆</span>
							)}
						</div>
					</div>
				</div>

				{/* EAST */}
				<div className="flex items-center gap-12 flex-row-reverse">
					<div className="flex flex-col gap-10">
						<span className="text-[8px] font-bold text-red-500/50 uppercase text-center mb-2">First Round</span>
						{renderMatchup('first_round', 4, 'BOS', 'MIA')}
						{renderMatchup('first_round', 5, 'CLE', 'ORL')}
						{renderMatchup('first_round', 6, 'MIL', 'IND')}
						{renderMatchup('first_round', 7, 'NYK', 'PHI')}
					</div>
					<div className="flex flex-col gap-36">
						<span className="text-[8px] font-bold text-red-500/50 uppercase text-center mb-2">Semis</span>
						{renderMatchup('conf_semis', 2, predictions['first_round_4'], predictions['first_round_5'])}
						{renderMatchup('conf_semis', 3, predictions['first_round_6'], predictions['first_round_7'])}
					</div>
					<div>
						<span className="text-[8px] font-bold text-red-500/50 uppercase text-center mb-2">Finals</span>
						{renderMatchup('conf_finals', 1, predictions['conf_semis_2'], predictions['conf_semis_3'])}
					</div>
				</div>
			</motion.div>

			{/* BOTTOM BAR */}
			<div className="mt-auto pb-4 w-full flex justify-center gap-4">
				<button onClick={() => setZoom(z => Math.max(z - 0.05, 0.5))} className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg font-bold hover:bg-white/10">−</button>
				<button 
					onClick={handleSave} 
					disabled={isLocked || loading} 
					className="bg-orange-600 hover:bg-orange-500 text-white px-12 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all"
				>
					{loading ? 'SAVING...' : 'SAVE BRACKET'}
				</button>
				<button onClick={() => setZoom(z => Math.min(z + 0.05, 1.2))} className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-lg font-bold hover:bg-white/10">+</button>
			</div>
		</div>
	);
}