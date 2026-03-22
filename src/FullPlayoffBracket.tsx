import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from './supabaseClient';

const TEAM_LOGOS: Record<string, string> = {
	'Nuggets': 'https://upload.wikimedia.org/wikipedia/en/7/76/Denver_Nuggets.svg',
	'Timberwolves': 'https://upload.wikimedia.org/wikipedia/en/7/7d/Minnesota_Timberwolves_logo_2017.svg',
	'Thunder': 'https://upload.wikimedia.org/wikipedia/en/5/5d/Oklahoma_City_Thunder.svg',
	'Mavericks': 'https://upload.wikimedia.org/wikipedia/en/9/97/Dallas_Mavericks_logo.svg',
	'Celtics': 'https://upload.wikimedia.org/wikipedia/en/8/8f/Boston_Celtics.svg',
	'Cavaliers': 'https://upload.wikimedia.org/wikipedia/en/4/4b/Cleveland_Cavaliers_logo_2022.svg',
	'Knicks': 'https://upload.wikimedia.org/wikipedia/en/2/25/New_York_Knicks_logo.svg',
	'Pacers': 'https://upload.wikimedia.org/wikipedia/en/1/1b/Indiana_Pacers.svg',
};

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
	const containerRef = useRef<HTMLDivElement>(null);

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
		const currentKey = `${stageId}_${gameIndex}`;
		newPredictions[currentKey] = team;

		// Cleanup logic for subsequent rounds
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

	const renderMatchup = (stageId: string, gameIndex: number, teamA: string | null, teamB: string | null, side: 'left' | 'right' | 'center') => {
		const winner = predictions[`${stageId}_${gameIndex}`];

		return (
			<div className="relative group">
				<div className="flex flex-col gap-[2px] w-52 bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm transition-all hover:border-white/30">
					{[teamA, teamB].map((team, idx) => (
						<button
							key={idx}
							disabled={isLocked || !team}
							onClick={() => team && handleWinnerSelect(stageId, gameIndex, team)}
							className={`flex items-center justify-between px-4 py-3 transition-all ${
								winner === team && team 
									? 'bg-orange-500/20 text-orange-400' 
									: 'hover:bg-white/5 text-gray-400'
							} ${!team ? 'opacity-20' : ''}`}
						>
							<div className="flex items-center gap-3">
								<div className="w-6 h-6 flex items-center justify-center">
									{team && TEAM_LOGOS[team] ? (
										<img src={TEAM_LOGOS[team]} alt="" className="w-full h-full object-contain" />
									) : (
										<div className="w-4 h-4 rounded-full border border-white/10" />
									)}
								</div>
								<span className="text-[11px] font-black uppercase tracking-wider">
									{team || 'TBD'}
								</span>
							</div>
							{winner === team && team && (
								<motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-black">✓</motion.span>
							)}
						</button>
					))}
				</div>
				
				{/* CONNECTOR LINES (CSS) */}
				{side === 'left' && stageId === 'conf_semis' && (
					<div className="absolute top-1/2 -right-12 w-12 h-[1px] bg-white/10" />
				)}
				{side === 'right' && stageId === 'conf_semis' && (
					<div className="absolute top-1/2 -left-12 w-12 h-[1px] bg-white/10" />
				)}
			</div>
		);
	};

	if (loading) return <div className="p-20 text-center animate-pulse text-blue-400">LOADING BRACKET...</div>;

	return (
		<div className="w-full h-full relative">
			<div ref={containerRef} className="overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing pb-40 md:pb-12 no-scrollbar">
				<motion.div 
					className="min-w-[1400px] p-12 flex justify-between items-center"
					animate={{ scale: zoom }}
					transition={{ type: 'spring', stiffness: 300, damping: 30 }}
				>
					{/* WEST CONFERENCE */}
					<div className="flex gap-16 items-center">
						<div className="space-y-24">
							<div className="text-center mb-4 text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Conf. Semifinals</div>
							{renderMatchup('conf_semis', 0, 'Thunder', 'Mavericks', 'left')}
							{renderMatchup('conf_semis', 1, 'Nuggets', 'Timberwolves', 'left')}
						</div>
						<div className="space-y-0">
							<div className="text-center mb-4 text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Conf. Finals</div>
							{renderMatchup('conf_finals', 0, predictions['conf_semis_0'], predictions['conf_semis_1'], 'left')}
						</div>
					</div>

					{/* THE FINALS CENTERPIECE */}
					<div className="flex flex-col items-center gap-12 px-12">
						<div className="text-center">
							<div className="inline-block px-4 py-1 rounded-full border border-orange-500/30 bg-orange-500/10 text-[10px] font-black text-orange-400 uppercase tracking-[0.4em] mb-6">NBA FINALS</div>
							{renderMatchup('finals', 0, predictions['conf_finals_0'], predictions['conf_finals_1'], 'center')}
						</div>
						
						<div className="flex flex-col items-center">
							<div className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.4em] mb-4">Champion</div>
							<motion.div 
								whileHover={{ scale: 1.05 }}
								onClick={() => !isLocked && predictions['finals_0'] && handleWinnerSelect('champion', 0, predictions['finals_0'])}
								className={`w-40 h-40 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer relative ${
									predictions['champion_0'] 
										? 'border-yellow-500 bg-yellow-500/5 shadow-[0_0_50px_rgba(234,179,8,0.2)]' 
										: 'border-white/10 bg-black/40'
								}`}
							>
								{predictions['champion_0'] ? (
									<>
										<img src={TEAM_LOGOS[predictions['champion_0']]} alt="Winner" className="w-24 h-24 object-contain z-10" />
										<div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full" />
									</>
								) : (
									<span className="text-5xl opacity-20">🏆</span>
								)}
							</motion.div>
						</div>
					</div>

					{/* EAST CONFERENCE */}
					<div className="flex gap-16 items-center flex-row-reverse">
						<div className="space-y-24">
							<div className="text-center mb-4 text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Conf. Semifinals</div>
							{renderMatchup('conf_semis', 2, 'Celtics', 'Cavaliers', 'right')}
							{renderMatchup('conf_semis', 3, 'Knicks', 'Pacers', 'right')}
						</div>
						<div className="space-y-0">
							<div className="text-center mb-4 text-[10px] font-black text-white/30 uppercase tracking-[0.4em]">Conf. Finals</div>
							{renderMatchup('conf_finals', 1, predictions['conf_semis_2'], predictions['conf_semis_3'], 'right')}
						</div>
					</div>
				</motion.div>
			</div>

			{/* MOBILE CONTROLS */}
			<div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-2xl border-t border-white/10 p-5 flex items-center justify-between z-50">
				<div className="flex items-center gap-4">
					<button onClick={() => setZoom(z => Math.max(z - 0.1, 0.4))} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white active:bg-white/20 transition-all">−</button>
					<div className="text-center">
						<div className="text-[8px] font-black text-gray-500 uppercase">Zoom</div>
						<div className="text-xs font-black text-white">{Math.round(zoom * 100)}%</div>
					</div>
					<button onClick={() => setZoom(z => Math.min(z + 0.1, 1.2))} className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white active:bg-white/20 transition-all">+</button>
				</div>
				<button onClick={handleSave} disabled={isLocked || loading} className="bg-orange-600 hover:bg-orange-500 text-white px-10 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all">
					{loading ? 'SAVING...' : 'SAVE BRACKET'}
				</button>
			</div>
		</div>
	);
}