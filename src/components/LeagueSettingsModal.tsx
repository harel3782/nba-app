import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	leagueId: string;
	currentName: string;
	currentOpenDate: string | null;
	currentLockDate: string | null;
	currentScoringType: string;
	onUpdate: () => void;
	onDelete?: () => void;
}

export function LeagueSettingsModal({ isOpen, onClose, leagueId, currentName, currentOpenDate, currentLockDate, currentScoringType, onUpdate, onDelete }: Props) {
	const [name, setName] = useState(currentName);
	const [openDate, setOpenDate] = useState(currentOpenDate ? new Date(currentOpenDate).toISOString().slice(0, 16) : '');
	const [lockDate, setLockDate] = useState(currentLockDate ? new Date(currentLockDate).toISOString().slice(0, 16) : '');
	const [scoringType] = useState(currentScoringType || 'standard');
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	if (!isOpen) return null;

	async function handleSave() {
		setSaving(true);
		
		// Update the league with both open_at and lock_at dates
		const { error } = await supabase
			.from('leagues')
			.update({
				name,
				open_at: openDate ? new Date(openDate).toISOString() : null,
				lock_at: lockDate ? new Date(lockDate).toISOString() : null,
				scoring_type: scoringType
			})
			.eq('id', leagueId);

		setSaving(false);
		if (error) {
			console.error(error);
			alert('Error updating league');
		} else {
			onUpdate();
			onClose();
		}
	}

	async function handleDelete() {
		const confirmed = window.confirm('🚨 WARNING: Are you sure you want to delete this league? This will permanently delete the league and ALL user predictions associated with it. This action CANNOT be undone.');
		if (!confirmed) return;

		setDeleting(true);
		
		try {
			const { error: err1 } = await supabase.from('predictions').delete().eq('league_id', leagueId);
			if (err1) throw err1;
			
			const { error: err2 } = await supabase.from('league_members').delete().eq('league_id', leagueId);
			if (err2) throw err2;
			
			const { data: deletedData, error: err3 } = await supabase.from('leagues').delete().eq('id', leagueId).select();
			if (err3) throw err3;

			if (!deletedData || deletedData.length === 0) {
				throw new Error("Supabase RLS is blocking the deletion. You need to enable DELETE policies in your Supabase SQL Editor.");
			}

			if (onDelete) onDelete();
		} catch (error: any) {
			console.error('Error deleting league:', error);
			alert('Deletion Failed: ' + error.message);
		} finally {
			setDeleting(false);
		}
	}

	return (
		<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<div className="bg-[#0f172a] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
				<h2 className="text-2xl font-black uppercase italic mb-6 text-white">League Settings</h2>
				
				<div className="space-y-4 mb-8">
					<div>
						<label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">League Name</label>
						<input 
							type="text" 
							value={name} 
							onChange={e => setName(e.target.value)} 
							className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none transition-colors"
						/>
					</div>
					
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Opens At</label>
							<input 
								type="datetime-local" 
								value={openDate} 
								onChange={e => setOpenDate(e.target.value)} 
								className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none transition-colors text-xs"
							/>
						</div>
						<div>
							<label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Locks At</label>
							<input 
								type="datetime-local" 
								value={lockDate} 
								onChange={e => setLockDate(e.target.value)} 
								className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none transition-colors text-xs"
							/>
						</div>
					</div>
				</div>

				<div className="flex justify-between items-center pt-4 border-t border-white/10">
					<button 
						onClick={handleDelete}
						disabled={deleting || saving}
						className="text-red-500 hover:text-red-400 text-[11px] font-black uppercase tracking-widest transition-colors disabled:opacity-50"
					>
						{deleting ? 'Deleting...' : 'Delete League'}
					</button>

					<div className="flex gap-3">
						<button 
							onClick={onClose}
							disabled={deleting || saving}
							className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
						>
							Cancel
						</button>
						<button 
							onClick={handleSave}
							disabled={saving || deleting}
							className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50"
						>
							{saving ? 'Saving...' : 'Save'}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}