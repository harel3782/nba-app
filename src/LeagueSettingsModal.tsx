import { useState } from 'react';
import { supabase } from './supabaseClient';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	leagueId: string;
	currentName: string;
	currentLockDate: string | null;
	currentScoringType?: string; // new: current scoring type
	onUpdate: () => void;
}

export function LeagueSettingsModal({
	isOpen,
	onClose,
	leagueId,
	currentName,
	currentLockDate,
	currentScoringType,
	onUpdate,
}: Props) {
	const [name, setName] = useState(currentName);
	const [lockDate, setLockDate] = useState(
		currentLockDate ? new Date(currentLockDate).toISOString().slice(0, 16) : '',
	);
	const [scoringType, setScoringType] = useState(currentScoringType || 'standard'); // state for scoring method
	const [loading, setLoading] = useState(false);

	if (!isOpen) return null;

	async function handleSave() {
		setLoading(true);
		try {
			const updates: any = {
				name,
				scoring_type: scoringType, // send the chosen scoring method
			};

			if (lockDate) {
				updates.lock_at = new Date(lockDate).toISOString();
			} else {
				updates.lock_at = null;
			}

			const { error } = await supabase.from('leagues').update(updates).eq('id', leagueId);

			if (error) throw error;

			onUpdate();
			onClose();
		} catch (error) {
			console.error(error);
			alert('Error updating settings');
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
			<div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

			<div className="relative bg-[#0F172A] border border-gray-700 w-full max-w-md rounded-2xl shadow-2xl p-6 overflow-hidden">
				<h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
					⚙️ League Settings
				</h2>

				<div className="space-y-6">
					{/* League Name */}
					<div>
						<label className="block text-blue-200 text-xs font-bold uppercase mb-2">
							League Name
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:border-orange-500 outline-none"
						/>
					</div>

					{/* Scoring system - new addition */}
					<div>
						<label className="block text-blue-200 text-xs font-bold uppercase mb-2">
							Scoring System
						</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								type="button"
								onClick={() => setScoringType('standard')}
								className={`p-3 rounded-lg border text-sm font-bold transition-all
									${
										scoringType === 'standard'
											? 'bg-orange-600 border-orange-500 text-white shadow-lg'
											: 'bg-black/40 border-gray-600 text-gray-400 hover:bg-gray-800'
									}`}
							>
								Standard
								<span className="block text-[10px] font-normal opacity-70 mt-1">
									Linear Penalty (Abs Diff)
								</span>
							</button>

							<button
								type="button"
								onClick={() => setScoringType('squared')}
								className={`p-3 rounded-lg border text-sm font-bold transition-all
										${
											scoringType === 'squared'
												? 'bg-red-600 border-red-500 text-white shadow-lg'
												: 'bg-black/40 border-gray-600 text-gray-400 hover:bg-gray-800'
										}`}
							>
								Strict (Squared)
								<span className="block text-[10px] font-normal opacity-70 mt-1">
									Heavy Penalty for big misses
								</span>
							</button>
						</div>
					</div>

					{/* Deadline */}
					<div>
						<label className="block text-blue-200 text-xs font-bold uppercase mb-2">
							Predictions Deadline
						</label>
						<input
							type="datetime-local"
							value={lockDate}
							onChange={(e) => setLockDate(e.target.value)}
							className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:border-orange-500 outline-none [color-scheme:dark]"
						/>
					</div>

					<div className="flex gap-3 mt-8 pt-4 border-t border-gray-800">
						<button
							onClick={onClose}
							className="flex-1 py-3 rounded-lg text-gray-400 hover:bg-white/5"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={loading}
							className="flex-1 py-3 rounded-lg bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold shadow-lg"
						>
							{loading ? 'Saving...' : 'Save Settings'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
