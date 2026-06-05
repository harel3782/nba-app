import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	leagueId: string;
	currentName: string;
	currentRegularLockDate: string | null;
	currentPlayoffLockDate: string | null;
	currentScoringType: string;
	onUpdate: () => void;
	onDelete?: () => void;
}

const toLocalDatetimeInput = (dateStr: string | null) => {
	if (!dateStr) return '';
	const d = new Date(dateStr);
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function LeagueSettingsModal({ isOpen, onClose, leagueId, currentName, currentRegularLockDate, currentPlayoffLockDate, currentScoringType, onUpdate, onDelete }: Props) {
	const [name, setName] = useState(currentName);
	const [regLockDate, setRegLockDate] = useState(toLocalDatetimeInput(currentRegularLockDate));
	const [playLockDate, setPlayLockDate] = useState(toLocalDatetimeInput(currentPlayoffLockDate));
	const [scoringType] = useState(currentScoringType || 'standard');
	const [saving, setSaving] = useState(false);
	const [deleting, setDeleting] = useState(false);

	if (!isOpen) return null;

	async function handleSave() {
		setSaving(true);
		
		// Ensure you are using the new column names found in your DB
		const { error } = await supabase
			.from('leagues')
			.update({
				name,
				regular_season_lock_at: regLockDate ? new Date(regLockDate).toISOString() : null,
				playoff_lock_at: playLockDate ? new Date(playLockDate).toISOString() : null,
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
		const confirmed = window.confirm('🚨 WARNING: Are you sure you want to delete this league? This will permanently delete the league and ALL user predictions associated with it.');
		if (!confirmed) return;

		setDeleting(true);
		
		try {
			// ✅ FIX: Using new table names instead of 'predictions'
			const { error: err1 } = await supabase.from('user_regular_picks').delete().eq('league_id', leagueId);
			if (err1) throw err1;

			const { error: errBracket } = await supabase.from('user_bracket_picks').delete().eq('league_id', leagueId);
			if (errBracket) throw errBracket;

			const { error: err2 } = await supabase.from('league_members').delete().eq('league_id', leagueId);
			if (err2) throw err2;

			const { data: deletedData, error: err3 } = await supabase.from('leagues').delete().eq('id', leagueId).select();
			if (err3) throw err3;

			if (!deletedData || deletedData.length === 0) {
				throw new Error("Supabase RLS is blocking the deletion.");
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
				<h2 className="text-2xl font-black uppercase italic mb-6 text-white text-center">League Settings</h2>
				
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
					
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div>
							<label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Regular Season Lock</label>
							<input
								type="datetime-local"
								value={regLockDate}
								onChange={e => setRegLockDate(e.target.value)}
								className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-orange-500 focus:outline-none transition-colors text-xs"
							/>
						</div>
						<div>
							<label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Playoff Bracket Lock</label>
							<input
								type="datetime-local"
								value={playLockDate}
								onChange={e => setPlayLockDate(e.target.value)}
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
						<button onClick={onClose} disabled={deleting || saving} className="px-5 py-2.5 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
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