/* src/components/LeagueSettingsModal.tsx */

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Adjusted path based on reference

interface Props {
	isOpen: boolean;
	onClose: () => void;
	leagueId: string;
	currentName: string;
	currentLockDate: string | null;
	currentScoringType: string;
	onUpdate: () => void;
	onDelete: () => void; // New prop for deletion
}

export function LeagueSettingsModal({ 
	isOpen, 
	onClose, 
	leagueId, 
	currentName, 
	currentLockDate, 
	currentScoringType, 
	onUpdate,
	onDelete 
}: Props) {
	const [name, setName] = useState(currentName);
	const [lockDate, setLockDate] = useState(currentLockDate || '');
	const [scoringType, setScoringType] = useState(currentScoringType);
	const [loading, setLoading] = useState(false);
	const [showConfirmDelete, setShowConfirmDelete] = useState(false);

	useEffect(() => {
		setName(currentName);
		setLockDate(currentLockDate || '');
		setScoringType(currentScoringType);
		setShowConfirmDelete(false); // Reset confirmation on open
	}, [currentName, currentLockDate, currentScoringType, isOpen]);

	if (!isOpen) return null;

	const handleSave = async () => {
		setLoading(true);
		try {
			const { error } = await supabase
				.from('leagues')
				.update({
					name: name,
					lock_at: lockDate || null,
					scoring_type: scoringType
				})
				.eq('id', leagueId);

			if (error) throw error;
			onUpdate();
			onClose();
		} catch (error) {
			console.error('Error updating league:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		setLoading(true);
		try {
			// Note: Ensure your DB has ON DELETE CASCADE for members/predictions
			const { error } = await supabase
				.from('leagues')
				.delete()
				.eq('id', leagueId);

			if (error) throw error;
			onDelete();
			onClose();
		} catch (error) {
			console.error('Error deleting league:', error);
			alert('Could not delete league. Make sure all predictions are cleared first if cascade is off.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
			<div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
				<div className="flex items-center gap-2 mb-6">
					<span className="text-xl text-gray-400">⚙️</span>
					<h2 className="text-2xl font-bold text-white">League Settings</h2>
				</div>

				<div className="space-y-6">
					{/* Name Input */}
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
							League Name
						</label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-all"
						/>
					</div>

					{/* Scoring Selection */}
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
							Scoring System
						</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								onClick={() => setScoringType('linear')}
								className={`p-4 rounded-xl border text-center transition-all ${
									scoringType === 'linear' ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5 opacity-40'
								}`}
							>
								<div className="font-bold text-sm text-white">Standard</div>
								<div className="text-[10px] text-gray-400 mt-1">Linear (Abs Diff)</div>
							</button>

							<button
								onClick={() => setScoringType('squared')}
								className={`p-4 rounded-xl border text-center transition-all ${
									scoringType === 'squared' ? 'bg-red-600 border-red-400' : 'bg-black/20 border-white/5 opacity-40'
								}`}
							>
								<div className="font-bold text-sm text-white">Strict (Squared)</div>
								<div className="text-[10px] text-white/70 mt-1">High Penalty</div>
							</button>
						</div>
					</div>

					{/* Deadline Input */}
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
							Predictions Deadline
						</label>
						<input
							type="datetime-local"
							value={lockDate}
							onChange={(e) => setLockDate(e.target.value)}
							className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500 transition-all"
						/>
					</div>

					{/* Danger Zone */}
					<div className="pt-4 border-t border-white/5">
						{!showConfirmDelete ? (
							<button
								onClick={() => setShowConfirmDelete(true)}
								className="text-[10px] font-bold text-red-500/50 hover:text-red-500 uppercase tracking-widest transition-colors"
							>
								🗑️ Delete League
							</button>
						) : (
							<div className="bg-red-950/30 border border-red-900/50 p-3 rounded-xl animate-fade-in">
								<p className="text-xs text-red-200 mb-3 font-medium text-center">
									Are you sure? This will delete all members and predictions.
								</p>
								<div className="flex gap-2">
									<button
										onClick={handleDelete}
										disabled={loading}
										className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold py-2 rounded-lg transition-all"
									>
										Yes, Delete
									</button>
									<button
										onClick={() => setShowConfirmDelete(false)}
										className="flex-1 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold py-2 rounded-lg transition-all"
									>
										Cancel
									</button>
								</div>
							</div>
						)}
					</div>
				</div>

				<div className="flex flex-col gap-3 mt-8">
					<button
						onClick={handleSave}
						disabled={loading}
						className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
					>
						{loading ? 'Saving...' : 'Save Settings'}
					</button>
					<button
						onClick={onClose}
						className="w-full py-2 text-sm font-bold text-gray-500 hover:text-white transition-colors"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	);
}