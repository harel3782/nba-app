import { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { NBA_TEAMS, type Team } from './teams';
import { supabase } from './supabaseClient';

interface Props {
	conference: 'West' | 'East';
	userId: string;
	// Consider changing this to string | null to match App.tsx
	leagueId: string | null; 
	isLocked: boolean;
}

export function BettingBoard({ conference, userId, leagueId, isLocked }: Props) {
	const [teams, setTeams] = useState<Team[]>([]);
	const [saving, setSaving] = useState(false);
	const [initialLoad, setInitialLoad] = useState(true);

	// Filter teams by conference
	const conferenceTeams = NBA_TEAMS.filter(t => t.conference === conference);

	useEffect(() => {
		loadUserPredictions();
	}, [userId, leagueId]); // reloads if league or user change

	async function loadUserPredictions() {
		setInitialLoad(true);
		const { data } = await supabase
			.from('predictions')
			.select('team_id, predicted_rank')
			.eq('user_id', userId)
			.eq('league_id', leagueId)
			.in('team_id', conferenceTeams.map(t => t.id))
			.order('predicted_rank', { ascending: true });

		if (data && data.length > 0) {
			// If previous predictions exist, order by saved rank
			const orderedTeams = data.map(p => conferenceTeams.find(t => t.id === p.team_id)!);
			// Add missing teams (in case of bug or new team)
			const missingTeams = conferenceTeams.filter(t => !orderedTeams.some(ot => ot.id === t.id));
			setTeams([...orderedTeams, ...missingTeams]);
		} else {
			// If no predictions, default ordering
			setTeams(conferenceTeams);
		}
		setInitialLoad(false);
	}

	// --- Function that handles drag end ---
	const handleOnDragEnd = (result: DropResult) => {
		// 2. Logical protection: if locked, return immediately and don't change order
		if (isLocked) return; 
		
		if (!result.destination) return;

		const items = Array.from(teams);
		const [reorderedItem] = items.splice(result.source.index, 1);
		items.splice(result.destination.index, 0, reorderedItem);

		setTeams(items);
	};

	async function savePredictions() {
		if (isLocked) return; // extra protection on save
		setSaving(true);
		
		const predictionsToUpsert = teams.map((team, index) => ({
			user_id: userId,
			league_id: leagueId,
			team_id: team.id,
			predicted_rank: index + 1,
			conference: conference
		}));

		const { error } = await supabase
			.from('predictions')
			.upsert(predictionsToUpsert, { onConflict: 'user_id, league_id, team_id' });

		if (error) {
			console.error('Error saving:', error);
			alert('Error saving predictions');
		}

		setSaving(false);
	}

	if (initialLoad) return <div className="text-white/50 text-center p-10">Loading...</div>;

	return (
		<div className={`p-6 rounded-xl border transition-all ${isLocked ? 'bg-gray-900/50 border-gray-700' : 'bg-black/20 border-white/10'}`}>
			
			{/* Title with lock indicator */}
			<h2 className="text-2xl font-bold mb-4 text-white border-b border-white/10 pb-2 flex justify-between items-center">
				<span>{conference}</span>
				{isLocked ? (
					<span className="text-xs font-bold text-red-400 bg-red-900/30 px-2 py-1 rounded border border-red-500/30 flex items-center gap-1">
						🔒 LOCKED
					</span>
				) : (
					<span className="text-xs font-normal text-blue-200 mt-1">Drag to reorder</span>
				)}
			</h2>

			<DragDropContext onDragEnd={handleOnDragEnd}>
				<Droppable droppableId={conference}>
					{(provided) => (
						<ul className="space-y-2" {...provided.droppableProps} ref={provided.innerRef}>
							{teams.map((team, index) => (
								<Draggable 
									key={team.id} 
									draggableId={team.id} 
									index={index}
									isDragDisabled={isLocked} // Prevents physical dragging when locked
								>
									{(provided, snapshot) => (
										<li
											ref={provided.innerRef}
											{...provided.draggableProps}
											{...provided.dragHandleProps}
											className={`
												relative p-3 rounded-lg flex items-center justify-between transition-all border
												${isLocked 
													? 'bg-gray-800/50 border-gray-700 opacity-70 cursor-not-allowed' // dimmed styling when locked
													: snapshot.isDragging 
														? 'bg-[#1D428A] shadow-2xl scale-105 z-50 ring-2 ring-orange-500 border-orange-400' 
														: 'bg-gray-800 hover:bg-gray-700 border-gray-700 cursor-grab active:cursor-grabbing'
												}
											`}
										>
											<div className="flex items-center gap-4">
												<span className={`
													font-bold w-6 text-right text-lg
													${index + 1 <= 6 ? 'text-green-400' : index + 1 <= 10 ? 'text-orange-400' : 'text-gray-500'}
												`}>
												{index + 1}.
												</span>

												<img 
													src={team.logo} 
													alt={team.name} 
													className={`w-10 h-10 object-contain drop-shadow-md ${isLocked ? 'grayscale' : ''}`} // grayscale effect for logo when locked
													draggable={false} 
												/>
												
												<div className="flex flex-col">
													<span className="font-bold text-gray-200">{team.name}</span>
													<span className="text-[10px] uppercase tracking-wider text-gray-500">{team.id}</span>
												</div>
											</div>

											{/* Hamburger icon - hidden when locked */}
											{!isLocked && <div className="text-gray-600">☰</div>}
										</li>
									)}
								</Draggable>
								))}
							{provided.placeholder}
						</ul>
					)}
				</Droppable>
			</DragDropContext>

			{/* Save button - changes depending on lock */}
			<button
				onClick={savePredictions}
				disabled={saving || isLocked}
				className={`mt-6 w-full font-bold py-3 px-4 rounded shadow-lg transition-all flex items-center justify-center gap-2
					${isLocked 
						? 'bg-gray-700 text-gray-400 cursor-not-allowed border border-gray-600' 
						: 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white transform active:scale-[0.98]' }
				`}
			>
				{isLocked ? (
					<>🔒 Predictions Locked</>
				) : (
					saving ? 'Saving...' : `Save ${conference} Standings`
				)}
			</button>
		</div>
	);
}