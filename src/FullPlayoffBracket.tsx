import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';
import { NBA_TEAMS } from './teams'; // Using your existing teams list

interface Props {
	userId: string;
	leagueId: string;
	isLocked: boolean;
	onSave: () => void;
}

export function FullPlayoffBracket({ userId, leagueId, isLocked, onSave }: Props) {
	const [predictions, setPredictions] = useState<Record<string, string>>({});
	const [loading, setLoading] = useState(true);
	const [zoom, setZoom] = useState(1);
	const containerRef = useRef<HTMLDivElement>(null);

	// Helper to find logos from your NBA_TEAMS data
	const getTeamLogo = (shortName: string) => {
		const team = NBA_TEAMS.find(t => t.name.includes(shortName));
		return team ? team.logo : '';
	};

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

	const handleWinnerSelect = (stageId: string, gameIndex: number, team: string) => {
		if (isLocked) return;
		const newPredictions = { ...predictions };
		newPredictions[`${stageId}_${gameIndex}`] = team;

		// Reset subsequent rounds if a previous winner is changed
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

	const renderMatchup = (stageId: string, gameIndex: number, teamA: string | null, teamB: string | null) => {
		const winner = predictions[`${stageId}_${gameIndex}`];

		return (
			<div className="flex flex-col gap-[2px] w-64 bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
				{[teamA, teamB].map((team, idx) => (
					<button
						key={idx}
						disabled={isLocked || !team}
						onClick={() => team && handleWinnerSelect(stageId, gameIndex, team)}
						className={`flex items-center justify-between px-5 py-4 transition-all ${
							winner === team && team 
								? 'bg-orange-500/20 text-orange-400' 
								: 'hover:bg-white/5 text-gray-300'
						} ${!team ? 'opacity-20' : ''}`}
					>
						<div className="flex items-center gap-4">
							<div className="w-8 h-8 flex items-center justify-center p-0.5">
								{team ? (
									<img src={getTeamLogo(team)} alt="" className="w-full h-full object-contain" />
								) : (
									<div className="w-4 h-4 rounded-full border border-white/10" />
								)}
							</div>
							<span className="text-[13px] font-black uppercase tracking-widest">
								{team || 'TBD'}
							</span>
						</div>
						{winner === team && team && (
							<span className="text-[9px] bg-orange-500 text-white px-2 py-1 rounded font-black italic">WIN</span>
						)}
					</button>
				))}
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center animate-pulse text-blue-400 font-black">LOADING BRACKET...</div>;

	return (
		<div className="w-full relative">
			{/* REMOVED: Fixed height container. Now uses fluid overflow. */}
			<div 
				ref={containerRef} 
				className="w-full overflow-x-auto overflow-y-hidden no-scrollbar py-20"
			>
				<motion.div 
					className="flex justify-center items-center gap-24 px-40"
					style={{ 
						scale: zoom,
						width: 'max-content',
						margin: '0 auto',
						transformOrigin: 'center center' // Prevents clipping at edges
					}}
				>
					{/* WEST SIDE */}
					<div className="flex gap-20 items-center">
						<div className="space-y-32">
							<div className="text-center text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-4">West Semifinals</div>
							{renderMatchup('conf_semis', 0, 'Thunder', 'Mavericks')}
							{renderMatchup('conf_semis', 1, 'Nuggets', 'Timberwolves')}
						</div>
						<div className="space-y-0 pt-16">
							<div className="text-center text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-4">West Finals</div>
							{renderMatchup('conf_finals', 0, predictions['conf_semis_0'], predictions['conf_semis_1'])}
						</div>
					</div>

					{/* CENTER: NBA FINALS */}
					<div className="flex flex-col items-center gap-16 px-16">
						<div className="text-center">
							<div className="inline-block px-8 py-2 rounded-full border-2 border-orange-500/20 bg-orange-500/5 text-xs font-black text-orange-500 uppercase tracking-[0.8em] mb-12">NBA FINALS</div>
							{renderMatchup('finals', 0, predictions['conf_finals_0'], predictions['conf_finals_1'])}
						</div>
						
						<div className="flex flex-col items-center">
							<div className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.5em] mb-8">Champion</div>
							<motion.div 
								whileTap={{ scale: 0.9 }}
								onClick={() => !isLocked && predictions['finals_0'] && handleWinnerSelect('champion', 0, predictions['finals_0'])}
								className={`w-60 h-60 rounded-full border-4 flex items-center justify-center transition-all cursor-pointer relative group ${
									predictions['champion_0'] 
										? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_100px_rgba(234,179,8,0.2)]' 
										: 'border-white/10 bg-black/40 hover:border-white/30'
								}`}
							>
								{predictions['champion_0'] ? (
									<>
										<img src={getTeamLogo(predictions['champion_0'])} alt="Winner" className="w-32 h-32 object-contain z-10" />
										<div className="absolute inset-0 bg-yellow-500/10 blur-3xl rounded-full" />
									</>
								) : (
									<span className="text-7xl opacity-5 group-hover:opacity-20 transition-opacity">🏆</span>
								)}
							</motion.div>
						</div>
					</div>

					{/* EAST SIDE */}
					<div className="flex gap-20 items-center flex-row-reverse">
						<div className="space-y-32">
							<div className="text-center text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-4">East Semifinals</div>
							{renderMatchup('conf_semis', 2, 'Celtics', 'Cavaliers')}
							{renderMatchup('conf_semis', 3, 'Knicks', 'Pacers')}
						</div>
						<div className="space-y-0 pt-16">
							<div className="text-center text-[10px] font-black text-white/20 uppercase tracking-[0.5em] mb-4">East Finals</div>
							{renderMatchup('conf_finals', 1, predictions['conf_semis_2'], predictions['conf_semis_3'])}
						</div>
					</div>
				</motion.div>
			</div>

			{/* MOBILE BAR */}
			<div className="md:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-white/20 p-6 flex items-center justify-between z-50 shadow-[0_-20px_60px_rgba(0,0,0,1)]">
				<div className="flex items-center gap-6">
					<button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white text-2xl font-black active:bg-white/20 transition-all">−</button>
					<div className="text-center min-w-[50px]">
						<div className="text-[9px] font-black text-gray-600 uppercase mb-1">Scale</div>
						<div className="text-sm font-black text-white">{Math.round(zoom * 100)}%</div>
					</div>
					<button onClick={() => setZoom(z => Math.min(z + 0.1, 1.5))} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white text-2xl font-black active:bg-white/20 transition-all">+</button>
				</div>
				<button 
					onClick={handleSave} 
					disabled={isLocked || loading} 
					className="bg-gradient-to-r from-orange-600 to-red-600 text-white px-10 h-14 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg active:scale-95 disabled:opacity-50 transition-all"
				>
					{loading ? '...' : 'SAVE'}
				</button>
			</div>
		</div>
	);
}