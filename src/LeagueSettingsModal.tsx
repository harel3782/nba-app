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
	onDelete: () => void;
}

export function LeagueSettingsModal({ 
	isOpen, onClose, leagueId, currentName, currentLockDate, currentScoringType, onUpdate, onDelete 
}: Props) {
	const [name, setName] = useState(currentName);
	const [lockDate, setLockDate] = useState(currentLockDate || '');
	const [scoringType, setScoringType] = useState(currentScoringType);
	const [loading, setLoading] = useState(false);
	const [showConfirmDelete, setShowConfirmDelete] = useState(false);

	// Reset state when props change
	useEffect(() => {
		setName(currentName);
		setLockDate(currentLockDate || '');
		setScoringType(currentScoringType);
		setShowConfirmDelete(false);
	}, [currentName, currentLockDate, currentScoringType, isOpen]);

	if (!isOpen) return null;

	const handleSave = async () => {
		setLoading(true);
		try {
			const { error } = await supabase
				.from('leagues')
				.update({ name, lock_at: lockDate || null, scoring_type: scoringType })
				.eq('id', leagueId);
			if (error) throw error;
			onUpdate();
			onClose();
		} catch (err) {
			console.error('Update error:', err);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		setLoading(true);
		try {
			const { error } = await supabase.from('leagues').delete().eq('id', leagueId);
			if (error) throw error;
			onDelete();
			onClose();
		} catch (err) {
			console.error('Delete error:', err);
			alert('Failed to delete league.');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
			<div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md p-6">
				<h2 className="text-2xl font-bold text-white mb-6">⚙️ League Settings</h2>
				<div className="space-y-6">
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">League Name</label>
						<input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" />
					</div>
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Scoring System</label>
						<div className="grid grid-cols-2 gap-3">
							<button onClick={() => setScoringType('linear')} className={`p-4 rounded-xl border ${scoringType === 'linear' ? 'bg-white/5 border-white/20' : 'bg-black/20 opacity-40'}`}>
								<div className="font-bold text-white">Standard</div>
							</button>
							<button onClick={() => setScoringType('squared')} className={`p-4 rounded-xl border ${scoringType === 'squared' ? 'bg-red-600 border-red-400' : 'bg-black/20 opacity-40'}`}>
								<div className="font-bold text-white">Strict</div>
							</button>
						</div>
					</div>
					<div>
						<label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Predictions Deadline</label>
						<input type="datetime-local" value={lockDate} onChange={(e) => setLockDate(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white" />
					</div>
					<div className="pt-4 border-t border-white/5">
						{!showConfirmDelete ? (
							<button onClick={() => setShowConfirmDelete(true)} className="text-[10px] font-bold text-red-500/50 hover:text-red-500 uppercase">🗑️ Delete League</button>
						) : (
							<div className="bg-red-950/30 border border-red-900 p-3 rounded-xl">
								<p className="text-xs text-red-200 mb-3 text-center">Delete all data forever?</p>
								<div className="flex gap-2">
									<button onClick={handleDelete} className="flex-1 bg-red-600 text-white text-xs font-bold py-2 rounded-lg">Yes, Delete</button>
									<button onClick={() => setShowConfirmDelete(false)} className="flex-1 bg-white/5 text-gray-400 text-xs font-bold py-2 rounded-lg">Cancel</button>
								</div>
							</div>
						)}
					</div>
				</div>
				<div className="flex flex-col gap-3 mt-8">
					<button onClick={handleSave} disabled={loading} className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold shadow-lg">
						{loading ? 'Saving...' : 'Save Settings'}
					</button>
					<button onClick={onClose} className="w-full py-2 text-sm font-bold text-gray-500">Close</button>
				</div>
			</div>
		</div>
	);
}