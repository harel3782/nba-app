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
	// State for the form fields
	const [name, setName] = useState(currentName);
	const [lockDate, setLockDate] = useState(currentLockDate || '');
	const [scoringType, setScoringType] = useState(currentScoringType);
	const [loading, setLoading] = useState(false);

	// Update local state when props change or modal opens
	useEffect(() => {
		if (isOpen) {
			setName(currentName);
			setLockDate(currentLockDate || '');
			setScoringType(currentScoringType);
		}
	}, [isOpen, currentName, currentLockDate, currentScoringType]);

	if (!isOpen) return null;

	const handleUpdate = async () => {
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
			alert('Failed to update league settings');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
			<div className="bg-[#1e293b] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
				<div className="p-6">
					<h2 className="text-2xl font-bold text-white mb-6">League Settings</h2>
					
					<div className="space-y-4">
						{/* League Name Input */}
						<div>
							<label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
								League Name
							</label>
							<input
								type="text"
								value={name} // Use value instead of placeholder
								onChange={(e) => setName(e.target.value)}
								className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
							/>
						</div>

						{/* Lock Date Input */}
						<div>
							<label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
								Lock Predictions Date
							</label>
							<input
								type="datetime-local"
								value={lockDate}
								onChange={(e) => setLockDate(e.target.value)}
								className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
							/>
						</div>

						{/* Scoring Type Select */}
						<div>
							<label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
								Scoring System
							</label>
							<select
								value={scoringType}
								onChange={(e) => setScoringType(e.target.value)}
								className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 transition-colors"
							>
								<option value="linear">Linear (1pt per spot off)</option>
								<option value="squared">Squared (Penalty for big misses)</option>
							</select>
						</div>
					</div>

					<div className="flex gap-3 mt-8">
						<button
							onClick={onClose}
							className="flex-1 px-4 py-2 rounded-lg font-bold text-gray-400 hover:bg-white/5 transition-all"
						>
							Cancel
						</button>
						<button
							onClick={handleUpdate}
							disabled={loading}
							className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg"
						>
							{loading ? 'Saving...' : 'Save Changes'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}