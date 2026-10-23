"""Unit tests for the ESPN playoff mapping. Run from the repo root: python -m unittest scripts/test_main.py"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('SUPABASE_URL', 'https://example.supabase.co')
os.environ.setdefault('SUPABASE_KEY', 'header.payload.signature')

import main  # noqa: E402

_ids = {}


def team_id(abbr):
	return _ids.setdefault(abbr, str(len(_ids) + 1))


def play_in(note, winner, loser, completed=True):
	return {
		'season': {'type': 5},
		'competitions': [{
			'notes': [{'headline': note}],
			'status': {'type': {'completed': completed}},
			'competitors': [
				{'team': {'id': team_id(winner), 'abbreviation': winner}, 'winner': completed},
				{'team': {'id': team_id(loser), 'abbreviation': loser}, 'winner': False},
			],
		}],
	}


def series_game(label, wins, completed=True):
	teams = list(wins)
	return {
		'season': {'type': 3},
		'competitions': [{
			'notes': [{'headline': f'{label} - Game {sum(wins.values())}'}],
			'competitors': [{'team': {'id': team_id(t), 'abbreviation': t}} for t in teams],
			'series': {
				'type': 'playoff',
				'completed': completed,
				'competitors': [{'id': team_id(t), 'wins': w} for t, w in wins.items()],
			},
		}],
	}


SEEDS = {'OKC': 1, 'SAS': 2, 'MIN': 3, 'LAL': 4, 'HOU': 5, 'DEN': 6, 'POR': 7, 'PHX': 8, 'GSW': 9, 'LAC': 10}


class ComputePlayoffResultsTest(unittest.TestCase):
	def test_play_in_games_map_to_slots_with_one_game(self):
		results = main.compute_playoff_results([
			play_in('NBA Play-In - West - 7th Place vs 8th Place', 'POR', 'PHX'),
			play_in('NBA Play-In - West - 9th Place vs 10th Place', 'GS', 'LAC'),
			play_in('NBA Play-In - West - 8th Seed Game', 'PHX', 'GS'),
		], SEEDS)
		self.assertEqual(results, {'w_pi_7v8': ('POR', 1), 'w_pi_9v10': ('GSW', 1), 'w_pi_8th': ('PHX', 1)})

	def test_unfinished_games_and_series_are_ignored(self):
		results = main.compute_playoff_results([
			play_in('NBA Play-In - East - 7th Place vs 8th Place', 'PHI', 'ORL', completed=False),
			series_game('West 1st Round', {'OKC': 3, 'PHX': 0}, completed=False),
		], SEEDS)
		self.assertEqual(results, {})

	def test_first_round_slot_comes_from_the_top_seed(self):
		results = main.compute_playoff_results([
			series_game('West 1st Round', {'PHX': 0, 'OKC': 4}),
			series_game('West 1st Round', {'SA': 4, 'POR': 1}),
			series_game('West 1st Round', {'MIN': 4, 'DEN': 2}),
			series_game('West 1st Round', {'HOU': 2, 'LAL': 4}),
		], SEEDS)
		self.assertEqual(results, {
			'w_r1_1vs8': ('OKC', 4), 'w_r1_2vs7': ('SAS', 5), 'w_r1_3vs6': ('MIN', 6), 'w_r1_4vs5': ('LAL', 6),
		})

	def test_semis_are_placed_by_which_first_round_series_the_teams_came_from(self):
		results = main.compute_playoff_results([
			series_game('West 1st Round', {'OKC': 4, 'PHX': 0}, completed=False),
			series_game('West 1st Round', {'LAL': 4, 'HOU': 2}, completed=False),
			series_game('West 1st Round', {'SA': 4, 'POR': 1}, completed=False),
			series_game('West 1st Round', {'MIN': 4, 'DEN': 2}, completed=False),
			series_game('West Semifinals', {'LAL': 0, 'OKC': 4}),
			series_game('West Semifinals', {'MIN': 2, 'SA': 4}),
			series_game('West Finals', {'OKC': 3, 'SA': 4}),
			series_game('NBA Finals', {'SA': 1, 'NY': 4}),
		], SEEDS)
		self.assertEqual(results, {
			'w_semi_1': ('OKC', 4), 'w_semi_2': ('SAS', 6), 'w_conf_final': ('SAS', 7), 'nba_finals': ('NYK', 5),
		})

	def test_semis_without_known_first_round_are_skipped(self):
		results = main.compute_playoff_results([series_game('East Semifinals', {'NY': 4, 'PHI': 0})], SEEDS)
		self.assertEqual(results, {})

	def test_regular_season_head_to_head_series_are_not_playoff_results(self):
		game = series_game('West 1st Round', {'OKC': 4, 'PHX': 0})
		game['competitions'][0]['series']['type'] = 'season'
		self.assertEqual(main.compute_playoff_results([game], SEEDS), {})


if __name__ == '__main__':
	unittest.main()
