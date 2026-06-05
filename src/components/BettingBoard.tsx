import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { NBA_TEAMS, type Team } from '../lib/teams';
import { supabase } from '../lib/supabaseClient';

interface Props {
	conference: 'West' | 'East';
	userId: string;
	leagueId: string | null;
	isLocked: boolean;
	onSave?: () => void;
	triggerSave?: number;
}

export function BettingBoard({ conference, userId, leagueId, isLocked, onSave, triggerSave }: Props) {
	const [teams, setTeams] = useState<Team[]>([]);
	const [initialLoad, setInitialLoad] = useState(true);
	const [actualStandings, setActualStandings] = useState<Record<string, number>>({});

	const conferenceTeams = NBA_TEAMS.filter((t) => t.conference === conference);

	useEffect(() => {
		loadUserPredictionsAndStandings();
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [userId, leagueId]);

	useEffect(() => {
		if (triggerSave && triggerSave > 0) {
			if (conference === 'East') {
				setTimeout(() => {
					savePredictions();
				}, 500);
			} else {
				savePredictions();
			}
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [triggerSave]);

	async function loadUserPredictionsAndStandings() {
		if (!userId || !leagueId) return;

		// Only show loading state if we have no teams data yet
		if (teams.length === 0) {
			setInitialLoad(true);
		}

		const { data: predData } = await supabase
			.from('user_regular_picks')
			.select('team_id, predicted_rank')
			.eq('user_id', userId)
			.eq('league_id', leagueId)
			.in('team_id', conferenceTeams.map((t) => t.id))
			.order('predicted_rank', { ascending: true });

		const { data: actualData } = await supabase
			.from('official_regular_standings')
			.select('team_id, actual_rank')
			.in('team_id', conferenceTeams.map((t) => t.id));

		const standingsMap: Record<string, number> = {};
		if (actualData) {
			actualData.forEach(s => { standingsMap[s.team_id] = s.actual_rank; });
		}
		setActualStandings(standingsMap);

		if (predData && predData.length > 0) {
			const orderedTeams = predData
				.map((p) => conferenceTeams.find((t) => t.id === p.team_id))
				.filter((t): t is Team => !!t);
			const missingTeams = conferenceTeams.filter((t) => !orderedTeams.some((ot) => ot.id === t.id));
			setTeams([...orderedTeams, ...missingTeams]);
		} else {
			setTeams(conferenceTeams);
		}
		setInitialLoad(false);
	}

	const handleOnDragEnd = (result: DropResult) => {
		if (isLocked) return;
		if (!result.destination) return;
		const items = Array.from(teams);
		const [reorderedItem] = items.splice(result.source.index, 1);
		items.splice(result.destination.index, 0, reorderedItem);
		setTeams(items);
	};

	async function savePredictions() {
		if (isLocked) return;
		const predictionsToUpsert = teams.map((team, index) => ({
			user_id: userId,
			league_id: leagueId,
			team_id: team.id,
			predicted_rank: index + 1,
			conference: conference,
		}));

		const { error } = await supabase.from('user_regular_picks').upsert(predictionsToUpsert, { onConflict: 'user_id, league_id, team_id' });
		if (error) { 
			console.error('Error saving:', error); 
		} else if (onSave) {
			onSave();
		}
	}

	if (initialLoad && teams.length === 0) return <div className="text-white/50 text-center p-10 font-black italic animate-pulse">LOADING TEAMS...</div>;

	return (
		<div className="w-full p-6 lg:p-8 rounded-xl border transition-all bg-black/20 border-white/10 shadow-lg relative">
			{initialLoad && teams.length > 0 && (
				<div className="absolute top-4 right-6">
					<div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
				</div>
			)}
			<h2 className="text-2xl font-bold mb-6 text-white border-b border-white/10 pb-3 flex justify-between items-center">
				<span className="uppercase tracking-wider">{conference}</span>
				{isLocked ? (
					<span className="text-xs font-bold text-red-400 bg-red-900/30 px-3 py-1.5 rounded border border-red-500/30">🔒 LOCKED</span>
				) : (
					<span className="text-xs font-normal text-blue-200 mt-1 bg-blue-900/20 px-3 py-1 rounded-full border border-blue-500/20">Drag to reorder</span>
				)}
			</h2>

			<DragDropContext onDragEnd={handleOnDragEnd}>
				<Droppable droppableId={conference}>
					{(provided) => (
						<ul className="space-y-2.5" {...provided.droppableProps} ref={provided.innerRef}>
							{teams.map((team, index) => {
								const predictedRank = index + 1;
								const actualRank = actualStandings[team.id];
								let diffIndicator = null;

								if (actualRank !== undefined) {
									const diff = predictedRank - actualRank;
									const absDiff = Math.abs(diff);
									let colorClass = 'bg-red-500/10 text-red-400 border-red-500/20';
									if (absDiff === 0) colorClass = 'bg-green-500/20 text-green-400 border-green-500/40 shadow-[0_0_10px_rgba(74,222,128,0.2)]';
									else if (absDiff === 1) colorClass = 'bg-lime-500/20 text-lime-400 border-lime-500/40';
									else if (absDiff === 2) colorClass = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
									else if (absDiff === 3) colorClass = 'bg-orange-500/20 text-orange-400 border-orange-500/40';

									const arrow = diff > 0 ? '▲' : diff < 0 ? '▼' : '✔';
									diffIndicator = (
										<div className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border font-black text-[12px] min-w-[3.5rem] transition-all ${colorClass}`}>
											<span>{arrow}</span>
											{absDiff !== 0 && <span>{absDiff}</span>}
										</div>
									);
								}

								return (
									<Draggable key={team.id} draggableId={team.id} index={index} isDragDisabled={isLocked}>
										{(provided, snapshot) => (
											<li ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
												className={`relative p-3 md:p-4 rounded-lg flex items-center justify-between transition-all border ${snapshot.isDragging ? 'bg-[#1D428A] shadow-2xl scale-105 z-50 ring-2 ring-orange-500 border-orange-400' : 'bg-gray-800 border-gray-700'}`}>
												<div className="flex items-center gap-4 md:gap-5">
													<span className={`font-black w-6 text-right text-lg md:text-xl ${predictedRank <= 6 ? 'text-green-400' : predictedRank <= 10 ? 'text-orange-400' : 'text-gray-500'}`}>
														{predictedRank}.
													</span>
													<img src={team.logo} alt={team.name} className="w-10 h-10 md:w-11 md:h-11 object-contain drop-shadow-md" draggable={false} />
													<div className="flex flex-col">
														<span className="font-bold text-gray-200 text-sm md:text-base tracking-wide">{team.name}</span>
														<span className="text-xs uppercase tracking-wider text-gray-500 font-medium">{team.id}</span>
													</div>
												</div>
												<div className="flex items-center gap-3 md:gap-4">
													{diffIndicator}
													{!isLocked && <div className="text-gray-500 hover:text-white transition-colors ml-2 cursor-grab">☰</div>}
												</div>
											</li>
										)}
									</Draggable>
								);
							})}
							{provided.placeholder}
						</ul>
					)}
				</Droppable>
			</DragDropContext>
		</div>
	);
}