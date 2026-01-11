import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // make sure the path is correct

interface Props {
	leagueId: string;
	currentUserId: string;
}

export function LeagueSettings({ leagueId, currentUserId }: Props) {
	const [isAdmin, setIsAdmin] = useState(false);
	const [scoringType, setScoringType] = useState<'linear' | 'squared'>('linear');
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		checkPermissionsAndLoadSettings();
	}, [leagueId]);

	async function checkPermissionsAndLoadSettings() {
		// 1. Fetch league details to check the admin and current settings
		const { data: league } = await supabase
			.from('leagues')
			.select('created_by, scoring_type')
			.eq('id', leagueId)
			.single();

		if (league) {
			// Check: is the current user the admin?
			setIsAdmin(league.created_by === currentUserId);
			setScoringType(league.scoring_type as 'linear' | 'squared');
		}
		setLoading(false);
	}

	async function updateScoring(mode: 'linear' | 'squared') {
		if (!isAdmin) return; // client-side protection

		const { error } = await supabase
			.from('leagues')
			.update({ scoring_type: mode })
			.eq('id', leagueId);

		if (error) {
			console.error('Error:', error);
			alert('Failed to update settings');
		} else {
			setScoringType(mode);
			// Optional: reload the page so leaderboard scores update visually
			window.location.reload(); 
		}
	}

	if (loading) return null; // or a spinner
	if (!isAdmin) return null; // if not the admin, render nothing

	return (
		<div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700">
			<h3 className="text-white font-bold mb-3 flex items-center gap-2">
				⚙️ League Rules (Admin Only)
			</h3>
			
			<div className="flex gap-4">
				{/* Regular button */}
				<button
					onClick={() => updateScoring('linear')}
					className={`px-4 py-2 rounded transition-all font-bold ${
						scoringType === 'linear'
							? 'bg-blue-600 text-white ring-2 ring-blue-300'
							: 'bg-gray-700 text-gray-400 hover:bg-gray-600'
					}`} 
				>
					Regular Scoring
					<div className="text-[10px] font-normal opacity-70">1 place off = 1 point</div>
				</button>

				{/* Hardcore button */}
				<button
					onClick={() => updateScoring('squared')}
					className={`px-4 py-2 rounded transition-all font-bold ${
						scoringType === 'squared'
							? 'bg-red-600 text-white ring-2 ring-red-300'
							: 'bg-gray-700 text-gray-400 hover:bg-gray-600'
					}`} 
				>
					Hardcore Scoring (Squared)
					<div className="text-[10px] font-normal opacity-70">10 places off = 100 points!</div>
				</button>
			</div>
		</div>
	);
}