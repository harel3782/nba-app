import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	leagueId: string;
	currentName: string;
	currentLockDate: string | null;
	currentScoringType: string;
	onUpdate: () => void;
}

export function LeagueSettingsModal({ 
	isOpen, 
	onClose, 
	leagueId, 
	currentName, 
	currentLockDate, 
	currentScoringType, 
	onUpdate 
}: Props) {
	// Local state initialized with current props
	const [name, setName] = useState(currentName);
	const [lockDate, setLockDate] = useState(currentLockDate || '');
	const [scoringType, setScoringType] = useState(currentScoringType);
	const [loading, setLoading] = useState(false);

	// Ensure state is synced if the component stays mounted but props change
	useEffect(() => {
		setName(currentName);
		setLockDate(currentLockDate || '');
		setScoringType(currentScoringType);
	}, [currentName, currentLockDate, currentScoringType]);

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

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
			<div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6">
				{/* Header */}
				<div className="flex items-center gap-2 mb-6">
					<span className="text-xl text-gray-400">⚙️</span>
					<h2 className="text-2xl font-bold text-white">League Settings</h2>
				</div>

				<div className="space-y-6">
					{/* League Name Section */}
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

					{/* Scoring System Section (Boxes from your screenshot) */}
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
							Scoring System
						</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								onClick={() => setScoringType('linear')}
								className={`p-4 rounded-xl border text-center transition-all ${
									scoringType === 'linear'
										? 'bg-white/5 border-white/20'
										: 'bg-black/20 border-white/5 opacity-40 hover:opacity-60'
								}`}
							>
								<div className="font-bold text-sm text-white">Standard</div>
								<div className="text-[10px] text-gray-400 mt-1">Linear Penalty (Abs Diff)</div>
							</button>

							<button
								onClick={() => setScoringType('squared')}
								className={`p-4 rounded-xl border text-center transition-all ${
									scoringType === 'squared'
										? 'bg-red-600 border-red-400'
										: 'bg-black/20 border-white/5 opacity-40 hover:opacity-60'
								}`}
							>
								<div className="font-bold text-sm text-white">Strict (Squared)</div>
								<div className="text-[10px] text-white/70 mt-1">Heavy Penalty for big misses</div>
							</button>
						</div>
					</div>

					{/* Deadline Section */}
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
				</div>

				{/* Actions */}
				<div className="flex flex-col gap-3 mt-10">
					<button
						onClick={handleSave}
						disabled={loading}
						className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white py-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
					>
						{loading ? 'Saving...' : 'Save Settings'}
					</button>
					<button
						onClick={onClose}
						className="w-full py-3 text-sm font-bold text-gray-500 hover:text-white transition-colors"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	);
}